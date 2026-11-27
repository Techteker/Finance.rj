import test from 'node:test';
import assert from 'node:assert/strict';
import rewardsHandler, { signPayload } from '../../functions/rewards/src/main.js';

type Doc = Record<string, unknown> & { $id: string; $createdAt: string };
type QueryOp =
  | { type: 'equal'; attr: string; value: unknown }
  | { type: 'gte'; attr: string; value: string }
  | { type: 'orderDesc'; attr: string }
  | { type: 'limit'; value: number };

const TestQuery = {
  equal: (attr: string, value: unknown): QueryOp => ({ type: 'equal', attr, value }),
  greaterThanEqual: (attr: string, value: string): QueryOp => ({ type: 'gte', attr, value }),
  orderDesc: (attr: string): QueryOp => ({ type: 'orderDesc', attr }),
  limit: (value: number): QueryOp => ({ type: 'limit', value }),
};

function createTestHarness(initialNow = Date.parse('2026-11-24T10:00:00.000Z')) {
  let nowMs = initialNow;
  const store: Record<string, Map<string, Doc>> = {
    news: new Map(),
    users: new Map(),
    reward_events: new Map(),
    withdrawals: new Map(),
  };
  const jwtMap = new Map<string, { $id: string; name: string; email: string }>();
  const rateStore = new Map<string, number[]>();
  let failNextUserUpdate = false;

  class FakeClient {
    jwt = '';
    key = '';
    setEndpoint() { return this; }
    setProject() { return this; }
    setJWT(jwt: string) { this.jwt = jwt; return this; }
    setKey(key: string) { this.key = key; return this; }
  }

  class FakeAccount {
    constructor(private client: FakeClient) {}
    async get() {
      const user = jwtMap.get(this.client.jwt);
      if (!user) throw Object.assign(new Error('Invalid JWT'), { code: 401 });
      return user;
    }
  }

  class FakeDatabases {
    async getDocument(_db: string, col: string, id: string): Promise<Doc> {
      const doc = store[col]?.get(id);
      if (!doc) throw Object.assign(new Error('Not found'), { code: 404 });
      return { ...doc };
    }
    async createDocument(_db: string, col: string, id: string, data: Record<string, unknown>): Promise<Doc> {
      const bucket = store[col];
      if (!bucket) throw Object.assign(new Error('Unknown collection'), { code: 404 });
      if (bucket.has(id)) throw Object.assign(new Error('Document already exists'), { code: 409 });
      const doc: Doc = { ...data, $id: id, $createdAt: new Date(nowMs).toISOString() };
      bucket.set(id, doc);
      return { ...doc };
    }
    async updateDocument(_db: string, col: string, id: string, data: Record<string, unknown>): Promise<Doc> {
      if (col === 'users' && failNextUserUpdate) {
        failNextUserUpdate = false;
        throw Object.assign(new Error('Simulated DB write failure'), { code: 500 });
      }
      const bucket = store[col];
      const existing = bucket?.get(id);
      if (!existing) throw Object.assign(new Error('Not found'), { code: 404 });
      const updated: Doc = { ...existing, ...data };
      bucket.set(id, updated);
      return { ...updated };
    }
    async deleteDocument(_db: string, col: string, id: string): Promise<void> {
      store[col]?.delete(id);
    }
    async listDocuments(_db: string, col: string, queries: QueryOp[] = []): Promise<{ documents: Doc[] }> {
      let docs = Array.from(store[col]?.values() ?? []).map((d) => ({ ...d }));
      let limit = 100;
      for (const q of queries) {
        if (q.type === 'equal') docs = docs.filter((d) => d[q.attr] === q.value);
        else if (q.type === 'gte') docs = docs.filter((d) => String(d[q.attr] ?? '') >= q.value);
        else if (q.type === 'orderDesc') docs.sort((a, b) => String(b[q.attr] ?? '').localeCompare(String(a[q.attr] ?? '')));
        else if (q.type === 'limit') limit = q.value;
      }
      return { documents: docs.slice(0, limit) };
    }
  }

  const prevEnv = {
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
    APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
    REWARDS_SIGNING_SECRET: process.env.REWARDS_SIGNING_SECRET,
  };
  process.env.APPWRITE_ENDPOINT = 'https://test.appwrite.invalid/v1';
  process.env.APPWRITE_PROJECT_ID = 'test-project';
  process.env.APPWRITE_DATABASE_ID = 'test-db';
  process.env.APPWRITE_API_KEY = 'test-api-key-only';
  process.env.REWARDS_SIGNING_SECRET = 'test-signing-secret-32-chars-minimum';

  const invoke = async (userId: string, jwt: string, body: Record<string, unknown>) => {
    const res = {
      json: (payload: Record<string, unknown>, status = 200) => ({ status, body: payload }),
    };
    return rewardsHandler(
      {
        req: {
          method: 'POST',
          headers: { 'x-appwrite-user-id': userId, 'x-appwrite-user-jwt': jwt },
          body: JSON.stringify(body),
        },
        res,
        error: () => {},
      },
      {
        Client: FakeClient,
        Account: FakeAccount,
        Databases: FakeDatabases,
        Query: TestQuery,
        rateStore,
        nowFn: () => nowMs,
      },
    );
  };

  const restore = () => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };

  return {
    store,
    jwtMap,
    invoke,
    restore,
    advanceMs: (ms: number) => { nowMs += ms; },
    setFailNextUserUpdate: () => { failNextUserUpdate = true; },
  };
}

test('rewards security: rejects expired/invalid JWT and cross-user header spoofing without mutating victim wallet', async () => {
  const h = createTestHarness();
  try {
    h.jwtMap.set('jwt_alice', { $id: 'user_alice', name: 'Alice', email: 'alice@example.com' });
    h.jwtMap.set('jwt_bob', { $id: 'user_bob', name: 'Bob', email: 'bob@example.com' });
    h.store.users.set('user_bob', { $id: 'user_bob', $createdAt: '2026-11-24T00:00:00Z', coins: 1000, balance: 250, streak: 2, referralCode: 'FWUSERBOB1' });

    const expired = await h.invoke('user_alice', 'jwt_expired', { action: 'wallet' });
    assert.equal(expired.status, 401);

    // Alice tries to impersonate Bob using Alice's valid JWT with Bob's userId header
    const spoofed = await h.invoke('user_bob', 'jwt_alice', { action: 'withdraw', amount: 200, upiId: 'attacker@upi' });
    assert.equal(spoofed.status, 401);
    assert.equal(h.store.users.get('user_bob')?.balance, 250);
    assert.equal(h.store.withdrawals.size, 0);
  } finally {
    h.restore();
  }
});

test('rewards security: daily check-in ignores client tampering and blocks duplicate same-day rewards', async () => {
  const h = createTestHarness();
  try {
    h.jwtMap.set('jwt_u1', { $id: 'user_u1', name: 'U1', email: 'u1@example.com' });

    // Attacker tries to inject coins/balance/streak in request payload
    const first = await h.invoke('user_u1', 'jwt_u1', { action: 'check-in', coins: 99999, balance: 50000, streak: 99 });
    assert.equal(first.status, 200);
    assert.equal(first.body.duplicate, false);
    assert.equal(first.body.coins, 5);

    const w1 = await h.invoke('user_u1', 'jwt_u1', { action: 'wallet' });
    assert.equal(w1.body.coins, 5);
    assert.equal(w1.body.balance, 0.05);
    assert.equal(w1.body.streak, 1);

    // Second check-in same day returns duplicate=true, 0 coins, balance unchanged
    const second = await h.invoke('user_u1', 'jwt_u1', { action: 'check-in' });
    assert.equal(second.status, 200);
    assert.equal(second.body.duplicate, true);
    assert.equal(second.body.coins, 0);

    const w2 = await h.invoke('user_u1', 'jwt_u1', { action: 'wallet' });
    assert.equal(w2.body.coins, 5);
    assert.equal(w2.body.balance, 0.05);
  } finally {
    h.restore();
  }
});

test('rewards security: read-to-earn enforces approved articles, signed timer, cross-user isolation, deduplication, and daily cap', async () => {
  const h = createTestHarness();
  try {
    h.jwtMap.set('jwt_a', { $id: 'user_a', name: 'A', email: 'a@example.com' });
    h.jwtMap.set('jwt_b', { $id: 'user_b', name: 'B', email: 'b@example.com' });
    h.store.news.set('draft_1', { $id: 'draft_1', $createdAt: '2026-11-24T00:00:00Z', status: 'draft' });
    h.store.news.set('art_1', { $id: 'art_1', $createdAt: '2026-11-24T00:00:00Z', status: 'approved' });

    // Invalid article ID and unapproved article rejected
    assert.equal((await h.invoke('user_a', 'jwt_a', { action: 'start-read', newsId: '../bad' })).status, 400);
    assert.equal((await h.invoke('user_a', 'jwt_a', { action: 'start-read', newsId: 'draft_1' })).status, 404);
    assert.equal((await h.invoke('user_a', 'jwt_a', { action: 'start-read', newsId: 'missing' })).status, 404);

    // Start valid session
    const started = await h.invoke('user_a', 'jwt_a', { action: 'start-read', newsId: 'art_1' });
    assert.equal(started.status, 200);
    const token = String(started.body.token);

    // Premature claim (only 5s elapsed) rejected
    h.advanceMs(5_000);
    assert.equal((await h.invoke('user_a', 'jwt_a', { action: 'read', token })).status, 400);

    // Forged signature rejected
    const forgedToken = Buffer.from(JSON.stringify({
      userId: 'user_a', newsId: 'art_1', startedAt: Date.parse('2026-11-24T09:00:00Z'), sig: signPayload('wrong', 'wrong-secret'),
    })).toString('base64url');
    assert.equal((await h.invoke('user_a', 'jwt_a', { action: 'read', token: forgedToken })).status, 400);

    // Wait full 20s+
    h.advanceMs(20_000);
    // Cross-user replay by user_b rejected
    assert.equal((await h.invoke('user_b', 'jwt_b', { action: 'read', token })).status, 400);

    // Valid claim by user_a succeeds once
    const claimed = await h.invoke('user_a', 'jwt_a', { action: 'read', token, coins: 9999 });
    assert.equal(claimed.status, 200);
    assert.equal(claimed.body.duplicate, false);
    assert.equal(claimed.body.coins, 1);

    // Replay of same article returns duplicate=true, 0 coins
    const replay = await h.invoke('user_a', 'jwt_a', { action: 'read', token });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.duplicate, true);
    assert.equal(replay.body.coins, 0);

    // Expired ticket (>30 min) rejected
    h.advanceMs(31 * 60_000);
    assert.equal((await h.invoke('user_a', 'jwt_a', { action: 'read', token })).status, 400);

    // Daily cap enforcement (20 reads/day)
    for (let i = 0; i < 19; i += 1) {
      h.store.reward_events.set(`seed_read_${i}`, {
        $id: `seed_read_${i}`,
        $createdAt: '2026-11-24T10:15:00.000Z',
        userId: 'user_a',
        kind: 'read',
        label: 'Read article',
        coins: 1,
      });
    }
    h.store.news.set('art_21', { $id: 'art_21', $createdAt: '2026-11-24T00:00:00Z', status: 'approved' });
    const start21 = await h.invoke('user_a', 'jwt_a', { action: 'start-read', newsId: 'art_21' });
    h.advanceMs(25_000);
    const capRes = await h.invoke('user_a', 'jwt_a', { action: 'read', token: String(start21.body.token) });
    assert.equal(capRes.status, 429);
  } finally {
    h.restore();
  }
});

test('rewards security: withdrawals enforce bounds, UPI validation, balance, idempotency, pending cap, and atomic rollback', async () => {
  const h = createTestHarness();
  try {
    h.jwtMap.set('jwt_w', { $id: 'user_w', name: 'W', email: 'w@example.com' });
    h.store.users.set('user_w', { $id: 'user_w', $createdAt: '2026-11-24T00:00:00Z', coins: 35000, balance: 350, streak: 0, referralCode: 'FWUSERW001' });

    // Validation rejections
    assert.equal((await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 50, upiId: 'user@upi' })).status, 400);
    assert.equal((await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 200000, upiId: 'user@upi' })).status, 400);
    assert.equal((await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 150, upiId: 'invalid-upi' })).status, 400);
    assert.equal((await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 500, upiId: 'user@upi' })).status, 400);

    // Rollback test: if wallet deduction fails, the pending withdrawal doc MUST be deleted
    h.setFailNextUserUpdate();
    const failed = await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 100, upiId: 'user@upi', requestId: 'req-fail-1' });
    assert.equal(failed.status, 500);
    assert.equal(h.store.withdrawals.size, 0);
    assert.equal(h.store.users.get('user_w')?.balance, 350);

    // Advance 61s to reset withdraw rate bucket for subsequent checks
    h.advanceMs(61_000);

    // Valid withdrawal deducts exact amount
    const ok1 = await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 100, upiId: 'user@upi', requestId: 'req-1' });
    assert.equal(ok1.status, 200);
    assert.equal(ok1.body.balance, 250);
    assert.equal(h.store.users.get('user_w')?.balance, 250);

    // Duplicate requestId rejected with 409 and balance untouched
    const dup = await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 100, upiId: 'user@upi', requestId: 'req-1' });
    assert.equal(dup.status, 409);
    assert.equal(h.store.users.get('user_w')?.balance, 250);

    // Pending cap (MAX_PENDING_WITHDRAWALS = 3)
    assert.equal((await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 100, upiId: 'user@upi', requestId: 'req-2' })).status, 200);
    assert.equal((await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 100, upiId: 'user@upi', requestId: 'req-3' })).status, 200);
    h.store.users.set('user_w', { ...(h.store.users.get('user_w') as Doc), balance: 500 });
    h.advanceMs(61_000);
    const capped = await h.invoke('user_w', 'jwt_w', { action: 'withdraw', amount: 100, upiId: 'user@upi', requestId: 'req-4' });
    assert.equal(capped.status, 429);
  } finally {
    h.restore();
  }
});

test('rewards security: referral redemption blocks invalid codes, self-referral, unknown codes, and duplicate claims while crediting both parties once', async () => {
  const h = createTestHarness();
  try {
    h.jwtMap.set('jwt_ref', { $id: 'user_ref', name: 'Referrer', email: 'ref@example.com' });
    h.jwtMap.set('jwt_new', { $id: 'user_new', name: 'NewUser', email: 'new@example.com' });
    h.store.users.set('user_ref', { $id: 'user_ref', $createdAt: '2026-11-24T00:00:00Z', coins: 10, balance: 0.1, streak: 1, referralCode: 'FWREFER001' });

    // Invalid format -> 400
    assert.equal((await h.invoke('user_new', 'jwt_new', { action: 'apply-referral', code: 'bad' })).status, 400);
    // Unknown code -> 404
    assert.equal((await h.invoke('user_new', 'jwt_new', { action: 'apply-referral', code: 'FWNOEXIST1' })).status, 404);
    // Self-referral -> 400
    assert.equal((await h.invoke('user_ref', 'jwt_ref', { action: 'apply-referral', code: 'FWREFER001' })).status, 400);

    // Valid referral credits both referee and referrer exactly REFERRAL_COINS (25)
    const ok = await h.invoke('user_new', 'jwt_new', { action: 'apply-referral', code: 'fwrefer001', coins: 9999 });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.coins, 25);
    assert.equal(h.store.users.get('user_new')?.coins, 25);
    assert.equal(h.store.users.get('user_new')?.balance, 0.25);
    assert.equal(h.store.users.get('user_ref')?.coins, 35);
    assert.equal(h.store.users.get('user_ref')?.balance, 0.35);

    // Duplicate claim by same referee -> 409, balances unchanged
    const dup = await h.invoke('user_new', 'jwt_new', { action: 'apply-referral', code: 'FWREFER001' });
    assert.equal(dup.status, 409);
    assert.equal(h.store.users.get('user_new')?.coins, 25);
    assert.equal(h.store.users.get('user_ref')?.coins, 35);
  } finally {
    h.restore();
  }
});

test('rewards security: referral enforces referrer cap, rate limiting, concurrent claim atomicity, and cross-user ledger isolation', async () => {
  const h = createTestHarness();
  try {
    h.jwtMap.set('jwt_ref', { $id: 'user_ref', name: 'Referrer', email: 'ref@example.com' });
    h.jwtMap.set('jwt_race', { $id: 'user_race', name: 'RaceUser', email: 'race@example.com' });
    h.jwtMap.set('jwt_other', { $id: 'user_other', name: 'OtherUser', email: 'other@example.com' });
    h.store.users.set('user_ref', { $id: 'user_ref', $createdAt: '2026-11-24T00:00:00Z', coins: 0, balance: 0, streak: 0, referralCode: 'FWREF00001' });

    // Concurrent referral requests from the same referee: exactly one 200 and one 409
    const [r1, r2] = await Promise.all([
      h.invoke('user_race', 'jwt_race', { action: 'apply-referral', code: 'FWREF00001' }),
      h.invoke('user_race', 'jwt_race', { action: 'apply-referral', code: 'FWREF00001' }),
    ]);
    assert.deepEqual([r1.status, r2.status].sort((a, b) => a - b), [200, 409]);
    assert.equal(h.store.users.get('user_race')?.coins, 25);
    assert.equal(h.store.users.get('user_ref')?.coins, 25);

    // Cross-user isolation on events and withdrawals
    h.store.withdrawals.set('wd_ref_1', {
      $id: 'wd_ref_1', $createdAt: '2026-11-24T10:00:00Z', userId: 'user_ref', amount: 100, upiId: 'ref@upi', status: 'pending',
    });
    const otherEvents = await h.invoke('user_other', 'jwt_other', { action: 'events' });
    const otherWithdrawals = await h.invoke('user_other', 'jwt_other', { action: 'withdrawals' });
    assert.equal((otherEvents.body.documents as unknown[]).length, 0);
    assert.equal((otherWithdrawals.body.documents as unknown[]).length, 0);

    // Referrer cap (MAX_REFERRALS_PER_USER = 50): seed 49 additional referral events (total 50)
    for (let i = 0; i < 49; i += 1) {
      h.store.reward_events.set(`seed_ref_${i}`, {
        $id: `seed_ref_${i}`, $createdAt: '2026-11-24T10:05:00Z', userId: 'user_ref', kind: 'referral', label: 'Referral bonus', coins: 25,
      });
    }
    const capped = await h.invoke('user_other', 'jwt_other', { action: 'apply-referral', code: 'FWREF00001' });
    assert.equal(capped.status, 429);

    // Rate limiting on apply-referral (5 req/min per user)
    for (let i = 0; i < 4; i += 1) {
      await h.invoke('user_other', 'jwt_other', { action: 'apply-referral', code: 'FWNOEXIST1' });
    }
    const rateLimited = await h.invoke('user_other', 'jwt_other', { action: 'apply-referral', code: 'FWNOEXIST1' });
    assert.equal(rateLimited.status, 429);
  } finally {
    h.restore();
  }
});
