import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleRewardsAction,
  dailyCheckInCoins,
  reconcileWalletTotals,
  signPayload,
  hashIdempotencyKey,
  type RewardsDbAdapter,
} from '../../server/rewardsService';

function createMockRewardsDb(initialNow = Date.parse('2026-11-26T10:00:00.000Z')) {
  let nowMs = initialNow;
  let seq = 1;
  const wallets = new Map<string, Record<string, unknown>>();
  const txs = new Map<string, Record<string, unknown>>();
  const txByKey = new Set<string>();
  const withdrawals = new Map<string, Record<string, unknown>>();
  const wdByKey = new Set<string>();
  const news = new Map<string, { id: string; title: string; slug: string; status: string }>();
  const activities: Array<Record<string, unknown>> = [];

  const db: RewardsDbAdapter = {
    async getWallet(userId) {
      const w = wallets.get(userId);
      return w ? { ...w } : null;
    },
    async createWallet(row) {
      const uid = String(row.user_id);
      if (!wallets.has(uid)) {
        wallets.set(uid, { ...row, created_at: new Date(nowMs).toISOString(), updated_at: new Date(nowMs).toISOString() });
      }
      return { ...wallets.get(uid)! };
    },
    async updateWallet(userId, patch) {
      const existing = wallets.get(userId) ?? { user_id: userId };
      const updated = { ...existing, ...patch, updated_at: new Date(nowMs).toISOString() };
      wallets.set(userId, updated);
      return { ...updated };
    },
    async findWalletByReferralCode(code) {
      for (const w of wallets.values()) {
        if (w.referral_code === code) return { ...w };
      }
      return null;
    },
    async applyReferralReward(input) {
      const referrer = Array.from(wallets.values()).find((w) => w.referral_code === input.code);
      if (!referrer) return { status: 'not_found' };
      const referrerId = String(referrer.user_id);
      if (referrerId === input.refereeId) return { status: 'self' };
      const referee = wallets.get(input.refereeId);
      if (!referee) return { status: 'missing_wallet' };
      if (referee.referred_by) return { status: 'already_referred' };
      const count = Array.from(txs.values()).filter((t) => t.user_id === referrerId && t.kind === 'referral' && t.label === 'Referral bonus').length;
      if (count >= input.maxReferrals) return { status: 'limit' };
      const referrerKey = hashIdempotencyKey(`referral:referrer:${referrerId}:${input.refereeId}`);
      if (txByKey.has(input.refereeKey) || txByKey.has(referrerKey)) return { status: 'duplicate' };
      txByKey.add(input.refereeKey);
      txByKey.add(referrerKey);
      const refereeTx = { id: `tx_${seq++}`, user_id: input.refereeId, kind: 'referral', label: 'Referral welcome bonus', coins: input.coins, amount: input.amount, idempotency_key: input.refereeKey, reference_id: referrerId, created_at: new Date(nowMs).toISOString() };
      const referrerTx = { id: `tx_${seq++}`, user_id: referrerId, kind: 'referral', label: 'Referral bonus', coins: input.coins, amount: input.amount, idempotency_key: referrerKey, reference_id: input.refereeId, created_at: new Date(nowMs).toISOString() };
      txs.set(String(refereeTx.id), refereeTx);
      txs.set(String(referrerTx.id), referrerTx);
      wallets.set(input.refereeId, { ...referee, referred_by: referrerId });
      return { status: 'ok', referrerId };
    },
    async getApprovedNews(newsId) {
      const n = news.get(newsId);
      if (!n || (n.status !== 'approved' && n.status !== 'published')) return null;
      return { id: n.id, title: n.title, slug: n.slug };
    },
    async listTransactions(userId, limit = 500) {
      return Array.from(txs.values())
        .filter((t) => t.user_id === userId)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, limit);
    },
    async countTransactionsSince(userId, kind, sinceIso) {
      return Array.from(txs.values()).filter(
        (t) => t.user_id === userId && t.kind === kind && (!sinceIso || String(t.created_at) >= sinceIso),
      ).length;
    },
    async insertTransaction(row) {
      const key = String(row.idempotency_key);
      if (txByKey.has(key)) return { duplicate: true };
      txByKey.add(key);
      const id = `tx_${seq++}`;
      const rec = { ...row, id, created_at: new Date(nowMs).toISOString() };
      txs.set(id, rec);
      return { duplicate: false, row: rec };
    },
    async listWithdrawals(userId, limit = 500) {
      return Array.from(withdrawals.values())
        .filter((w) => w.user_id === userId)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, limit);
    },
    async countPendingWithdrawals(userId) {
      return Array.from(withdrawals.values()).filter((w) => w.user_id === userId && w.status === 'pending').length;
    },
    async insertWithdrawal(row) {
      const key = String(row.idempotency_key);
      if (wdByKey.has(key)) return { duplicate: true };
      wdByKey.add(key);
      const id = `wd_${seq++}`;
      const rec = { ...row, id, created_at: new Date(nowMs).toISOString(), updated_at: new Date(nowMs).toISOString() };
      withdrawals.set(id, rec);
      return { duplicate: false, row: rec };
    },
    async deleteWithdrawal(id) {
      const rec = withdrawals.get(id);
      if (rec) {
        wdByKey.delete(String(rec.idempotency_key));
        withdrawals.delete(id);
      }
    },
    async recordReadActivity(row) {
      activities.push(row);
    },
  };

  return {
    db,
    wallets,
    txs,
    withdrawals,
    news,
    activities,
    getNow: () => nowMs,
    advanceMs: (ms: number) => {
      nowMs += ms;
    },
  };
}

test('reconcileWalletTotals derives authoritative coins and balance from transactions minus withdrawals', () => {
  const totals = reconcileWalletTotals(
    [
      { coins: 10000, amount: 100 },
      { coins: 5000, amount: 50 },
    ],
    [
      { amount: 100, status: 'pending' },
      { amount: 25, status: 'rejected' }, // rejected does not deduct
    ],
  );
  assert.deepEqual(totals, { coins: 15000, balance: 50 });
});

test('Supabase rewards service enforces check-in idempotency, read duration, anti-forgery, referrals, and withdrawals', async () => {
  const secret = 'server-signing-secret-at-least-32-bytes';
  const rateStore = new Map<string, number[]>();
  const m = createMockRewardsDb();
  m.news.set('art-1', { id: 'art-1', title: 'RBI Update', slug: 'rbi-update', status: 'published' });
  m.news.set('art-draft', { id: 'art-draft', title: 'Draft', slug: 'draft', status: 'draft' });

  const alice = { userId: 'user-alice-1111', email: 'alice@example.com', name: 'Alice', role: 'user' as const };
  const bob = { userId: 'user-bob-2222', email: 'bob@example.com', name: 'Bob', role: 'user' as const };

  // 1. Check-in credits the scheduled streak reward once per India calendar day
  const ci1 = await handleRewardsAction(alice, { action: 'check-in', coins: 99999 }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(ci1.status, 200);
  assert.equal(ci1.body.coins, 2);
  assert.equal(ci1.body.duplicate, false);

  const ci2 = await handleRewardsAction(alice, { action: 'check-in' }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(ci2.body.duplicate, true);
  assert.equal(ci2.body.coins, 0);
  m.advanceMs(24 * 60 * 60 * 1000);
  const ci3 = await handleRewardsAction(alice, { action: 'check-in' }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(ci3.body.coins, 4);
  assert.equal(ci3.body.streak, 2);

  // 2. Read rewards block draft articles, premature claims, and cross-user token replay
  const draftStart = await handleRewardsAction(alice, { action: 'start-read', newsId: 'art-draft' }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(draftStart.status, 404);

  const start = await handleRewardsAction(alice, { action: 'start-read', newsId: 'art-1' }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(start.status, 200);
  const token = String(start.body.token);

  m.advanceMs(5_000);
  const tooEarly = await handleRewardsAction(alice, { action: 'read', token }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(tooEarly.status, 400);

  m.advanceMs(20_000);
  const crossUser = await handleRewardsAction(bob, { action: 'read', token }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(crossUser.status, 400);

  const forged = Buffer.from(JSON.stringify({ userId: alice.userId, newsId: 'art-1', startedAt: m.getNow() - 25_000, sig: signPayload('bad', 'wrong') })).toString('base64url');
  const forgedRes = await handleRewardsAction(alice, { action: 'read', token: forged }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(forgedRes.status, 400);

  const claim = await handleRewardsAction(alice, { action: 'read', token }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(claim.status, 200);
  assert.equal(claim.body.coins, 1);
  assert.equal(m.activities.length, 1);
  assert.equal(m.activities[0].activity_type, 'read_reward');

  // Replay is idempotent -> duplicate=true, 0 extra coins
  const replay = await handleRewardsAction(alice, { action: 'read', token }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(replay.body.duplicate, true);
  assert.equal(replay.body.coins, 0);

  // 3. Referral code credits both parties once and rejects self-referral / duplicate
  const aliceWallet = await handleRewardsAction(alice, { action: 'wallet' }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  const refCode = String(aliceWallet.body.referralCode);
  const selfRef = await handleRewardsAction(alice, { action: 'apply-referral', code: refCode }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(selfRef.status, 400);

  const bobRef = await handleRewardsAction(bob, { action: 'apply-referral', code: refCode }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(bobRef.status, 200);
  assert.equal(bobRef.body.coins, 1000);

  const bobDupRef = await handleRewardsAction(bob, { action: 'apply-referral', code: refCode }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(bobDupRef.status, 409);

  // 4. Withdrawal checks verified balance (cannot withdraw ₹100 with ₹0.31 balance)
  const lowBal = await handleRewardsAction(alice, { action: 'withdraw', amount: 100, upiId: 'alice@okaxis', requestId: 'req-1' }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(lowBal.status, 400);

  // Seed verified transaction of ₹250 and withdraw ₹100 idempotently
  await m.db.insertTransaction({
    user_id: alice.userId,
    kind: 'adjustment',
    label: 'Verified credit',
    coins: 25000,
    amount: 250,
    idempotency_key: 'seed-credit-1',
  });
  const wd1 = await handleRewardsAction(alice, { action: 'withdraw', amount: 100, upiId: 'alice@okaxis', requestId: 'req-ok-1' }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(wd1.status, 200);
  assert.equal(wd1.body.balance, 160.07);

  const wdDup = await handleRewardsAction(alice, { action: 'withdraw', amount: 100, upiId: 'alice@okaxis', requestId: 'req-ok-1' }, { db: m.db, signingSecret: secret, nowMs: m.getNow(), rateStore });
  assert.equal(wdDup.status, 409);
});


test('daily login reward schedule follows 2, 4, 6, then doubles from 12 onwards', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(dailyCheckInCoins), [2, 4, 6, 12, 24, 48, 96, 192, 384]);
});
