import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { getServerSupabaseConfig, getSupabaseAdmin, verifySupabaseSession, type VerifiedSession } from './supabaseAdmin';

export const REWARD_RULES = {
  CHECKIN_COINS: 2,
  READ_COINS: 1,
  REFERRAL_COINS: 1000,
  MAX_DAILY_READS: Math.max(1, Number(process.env.MAX_DAILY_READS || 20)),
  MAX_REFERRALS_PER_USER: Math.max(1, Number(process.env.MAX_REFERRALS_PER_USER || 50)),
  MAX_PENDING_WITHDRAWALS: Math.max(1, Number(process.env.MAX_PENDING_WITHDRAWALS || 3)),
  MIN_WITHDRAWAL: Math.max(1, Number(process.env.MIN_WITHDRAWAL || 100)),
  MAX_WITHDRAWAL: Math.max(100, Number(process.env.MAX_WITHDRAWAL || 100000)),
  COIN_RUPEES: 0.01,
  READ_SECONDS: 20,
} as const;

const UPI_REGEX = /^[\w.-]{2,64}@[a-zA-Z0-9]{2,32}$/;
const ARTICLE_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const REFERRAL_CODE_REGEX = /^FW[A-Z0-9]{6,12}$/;

const rateBuckets = new Map<string, number[]>();

export function indiaDateKey(nowMs: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));
}

export function indiaDayStartIso(nowMs: number): string {
  return new Date(`${indiaDateKey(nowMs)}T00:00:00+05:30`).toISOString();
}

export function dailyCheckInCoins(streakDay: number): number {
  const schedule = [2, 4, 6, 12, 24, 48, 96];
  if (!Number.isInteger(streakDay) || streakDay < 1) return 2;
  if (streakDay <= schedule.length) return schedule[streakDay - 1];
  return 96 * (2 ** (streakDay - schedule.length));
}

export const roundMoney = (value: number): number => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const hashIdempotencyKey = (value: string): string =>
  crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 48);

export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
  nowMs = Date.now(),
  store = rateBuckets,
): { allowed: boolean; retryAfterSec: number } {
  const cutoff = nowMs - windowMs;
  const recent = (store.get(key) || []).filter((ts) => ts > cutoff);
  if (recent.length >= limit) {
    store.set(key, recent);
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - nowMs) / 1000)) };
  }
  recent.push(nowMs);
  store.set(key, recent);
  if (store.size > 5000) {
    for (const [k, arr] of store.entries()) {
      if (!arr.length || arr[arr.length - 1] <= cutoff) store.delete(k);
    }
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function getRewardsSigningSecret(): string {
  return (process.env.REWARDS_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

export function deriveSigningKey(secret = getRewardsSigningSecret()): Buffer {
  return crypto.createHash('sha256').update(`forword:rewards-hmac:v1:${secret}`).digest();
}

export function signPayload(value: string, secret = getRewardsSigningSecret()): string {
  return crypto.createHmac('sha256', deriveSigningKey(secret)).update(String(value)).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function verifyReadTicket(
  token: unknown,
  expectedUserId: string,
  nowMs = Date.now(),
  secret = getRewardsSigningSecret(),
  readSeconds = REWARD_RULES.READ_SECONDS,
): { ok: true; newsId: string; elapsedSeconds: number } | { ok: false; error: string } {
  if (typeof token !== 'string' || !token || token.length > 1024) {
    return { ok: false, error: 'Invalid reading session.' };
  }
  let ticket: Record<string, unknown>;
  try {
    ticket = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, error: 'Invalid reading session.' };
  }
  if (
    !ticket ||
    typeof ticket !== 'object' ||
    typeof ticket.userId !== 'string' ||
    typeof ticket.newsId !== 'string' ||
    typeof ticket.sig !== 'string' ||
    !Number.isInteger(ticket.startedAt) ||
    !ARTICLE_ID_REGEX.test(ticket.newsId)
  ) {
    return { ok: false, error: 'Invalid reading session.' };
  }
  const startedAt = Number(ticket.startedAt);
  const payload = `${ticket.userId}:${ticket.newsId}:${startedAt}`;
  if (ticket.userId !== expectedUserId || !safeEqual(ticket.sig, signPayload(payload, secret))) {
    return { ok: false, error: 'Invalid reading session.' };
  }
  const elapsed = nowMs - startedAt;
  if (!Number.isFinite(elapsed) || elapsed < readSeconds * 1000) {
    return { ok: false, error: 'Please finish the reading timer first.' };
  }
  if (elapsed > 30 * 60 * 1000) {
    return { ok: false, error: 'Reading session expired. Start again.' };
  }
  return { ok: true, newsId: ticket.newsId, elapsedSeconds: Math.floor(elapsed / 1000) };
}

export function validateWithdrawalInput(
  body: Record<string, unknown>,
  minWithdrawal = REWARD_RULES.MIN_WITHDRAWAL,
  maxWithdrawal = REWARD_RULES.MAX_WITHDRAWAL,
): { ok: true; amount: number; upiId: string; requestId: string } | { ok: false; error: string } {
  const amount = roundMoney(Number(body?.amount));
  const upiId = String(body?.upiId || '').trim();
  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim().slice(0, 64) : '';
  if (!Number.isFinite(amount) || amount < minWithdrawal || amount > maxWithdrawal) {
    return { ok: false, error: `Amount must be between ₹${minWithdrawal} and ₹${maxWithdrawal}.` };
  }
  if (!UPI_REGEX.test(upiId)) {
    return { ok: false, error: 'Enter a valid UPI ID.' };
  }
  return { ok: true, amount, upiId, requestId };
}

export function buildWithdrawalKey(
  userId: string,
  amount: number,
  upiId: string,
  requestId = '',
  nowMs = Date.now(),
): string {
  if (requestId) return hashIdempotencyKey(`withdraw:${userId}:${requestId}`);
  const minuteBucket = Math.floor(nowMs / 60_000);
  return hashIdempotencyKey(`withdraw:${userId}:${roundMoney(amount)}:${upiId.toLowerCase()}:${minuteBucket}`);
}

/**
 * Computes authoritative wallet coins and rupee balance strictly from verified transactions
 * and non-rejected withdrawals so balances can never be manipulated client-side.
 */
export function reconcileWalletTotals(
  transactions: Array<{ coins?: number; amount?: number }>,
  withdrawals: Array<{ amount?: number; status?: string }>,
): { coins: number; balance: number } {
  const totalCoins = Math.max(
    0,
    transactions.reduce((sum, tx) => sum + Math.round(Number(tx.coins || 0)), 0),
  );
  const creditedRupees = transactions.reduce(
    (sum, tx) => sum + Number(tx.amount ?? Math.round(Number(tx.coins || 0)) * REWARD_RULES.COIN_RUPEES),
    0,
  );
  const debitedRupees = withdrawals
    .filter((w) => w.status !== 'rejected' && w.status !== 'cancelled')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  return {
    coins: totalCoins,
    balance: Math.max(0, roundMoney(creditedRupees - debitedRupees)),
  };
}

export interface RewardsDbAdapter {
  getWallet(userId: string): Promise<Record<string, unknown> | null>;
  createWallet(row: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateWallet(userId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  findWalletByReferralCode(code: string): Promise<Record<string, unknown> | null>;
  applyReferralReward(input: { refereeId: string; code: string; coins: number; amount: number; refereeKey: string; referrerKey: string; maxReferrals: number }): Promise<{ status: string; referrerId?: string }>;
  getApprovedNews(newsId: string): Promise<{ id: string; title: string; slug: string; category_name?: string; image_url?: string } | null>;
  listTransactions(userId: string, limit?: number): Promise<Array<Record<string, unknown>>>;
  countTransactionsSince(userId: string, kind: string, sinceIso?: string): Promise<number>;
  insertTransaction(row: Record<string, unknown>): Promise<{ duplicate: boolean; row?: Record<string, unknown> }>;
  listWithdrawals(userId: string, limit?: number): Promise<Array<Record<string, unknown>>>;
  countPendingWithdrawals(userId: string): Promise<number>;
  insertWithdrawal(row: Record<string, unknown>): Promise<{ duplicate: boolean; row?: Record<string, unknown> }>;
  deleteWithdrawal(id: string): Promise<void>;
  recordReadActivity(row: Record<string, unknown>): Promise<void>;
}

export function createSupabaseRewardsAdapter(): RewardsDbAdapter | null {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  return {
    async getWallet(userId) {
      const { data, error } = await admin.from('wallets').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
    async createWallet(row) {
      const { data, error } = await admin
        .from('wallets')
        .upsert(row, { onConflict: 'user_id' })
        .select('*')
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    async updateWallet(userId, patch) {
      const { data, error } = await admin
        .from('wallets')
        .update(patch)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    async findWalletByReferralCode(code) {
      const { data, error } = await admin
        .from('wallets')
        .select('*')
        .eq('referral_code', code)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
    async applyReferralReward(input) {
      const { data, error } = await admin.rpc('apply_referral_bonus', {
        p_referee_id: input.refereeId,
        p_code: input.code,
        p_coins: input.coins,
        p_amount: input.amount,
        p_referee_key: input.refereeKey,
        p_referrer_key: input.referrerKey,
        p_max_referrals: input.maxReferrals,
      });
      if (error) throw error;
      return data as { status: string; referrer_id?: string; referrerId?: string };
    },
    async getApprovedNews(newsId) {
      const { data, error } = await admin
        .from('news')
        .select('id, title, slug, category_name, image_url, status')
        .eq('id', newsId)
        .in('status', ['approved', 'published'])
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; title: string; slug: string; category_name?: string; image_url?: string } | null;
    },
    async listTransactions(userId, limit = 500) {
      const { data, error } = await admin
        .from('reward_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
    async countTransactionsSince(userId, kind, sinceIso) {
      let q = admin
        .from('reward_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('kind', kind);
      if (sinceIso) q = q.gte('created_at', sinceIso);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    async insertTransaction(row) {
      const { data, error } = await admin.from('reward_transactions').insert(row).select('*').single();
      if (error) {
        if (error.code === '23505') return { duplicate: true };
        throw error;
      }
      return { duplicate: false, row: data as Record<string, unknown> };
    },
    async listWithdrawals(userId, limit = 500) {
      const { data, error } = await admin
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
    async countPendingWithdrawals(userId) {
      const { count, error } = await admin
        .from('withdrawals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    async insertWithdrawal(row) {
      const { data, error } = await admin.from('withdrawals').insert(row).select('*').single();
      if (error) {
        if (error.code === '23505') return { duplicate: true };
        throw error;
      }
      return { duplicate: false, row: data as Record<string, unknown> };
    },
    async deleteWithdrawal(id) {
      await admin.from('withdrawals').delete().eq('id', id);
    },
    async recordReadActivity(row) {
      await admin.from('user_activity').insert(row);
    },
  };
}

export async function handleRewardsAction(
  session: VerifiedSession,
  body: Record<string, unknown>,
  deps: {
    db: RewardsDbAdapter;
    signingSecret: string;
    nowMs?: number;
    rateStore?: Map<string, number[]>;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { db, signingSecret, nowMs = Date.now(), rateStore = rateBuckets } = deps;
  const userId = session.userId;
  const action = typeof body.action === 'string' ? body.action.trim() : '';

  const rateLimit = action === 'withdraw' || action === 'apply-referral' ? 5 : action === 'check-in' ? 10 : 40;
  const rl = checkRateLimit(`${userId}:${action || 'unknown'}`, rateLimit, 60_000, nowMs, rateStore);
  if (!rl.allowed) {
    return { status: 429, body: { error: 'Too many requests. Please wait a moment and try again.' } };
  }

  const ensureWallet = async (targetUserId = userId): Promise<Record<string, unknown>> => {
    const existing = await db.getWallet(targetUserId);
    if (existing) return existing;
    const referralCode = 'FW' + targetUserId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    return db.createWallet({
      user_id: targetUserId,
      coins: 0,
      balance: 0,
      streak: 0,
      referral_code: referralCode,
    });
  };

  const syncAuthoritativeWallet = async (targetUserId: string, extraFields: Record<string, unknown> = {}) => {
    await ensureWallet(targetUserId);
    const [txs, wds] = await Promise.all([
      db.listTransactions(targetUserId, 1000),
      db.listWithdrawals(targetUserId, 500),
    ]);
    const totals = reconcileWalletTotals(
      txs as Array<{ coins?: number; amount?: number }>,
      wds as Array<{ amount?: number; status?: string }>,
    );
    return db.updateWallet(targetUserId, {
      coins: totals.coins,
      balance: totals.balance,
      ...extraFields,
    });
  };

  const recordCredit = async (
    targetUserId: string,
    kind: 'check-in' | 'read' | 'referral',
    label: string,
    coins: number,
    uniqueKey: string,
    extraWalletFields: Record<string, unknown> = {},
    referenceId?: string,
  ) => {
    const amount = roundMoney(coins * REWARD_RULES.COIN_RUPEES);
    const ins = await db.insertTransaction({
      user_id: targetUserId,
      kind,
      label,
      coins,
      amount,
      idempotency_key: hashIdempotencyKey(uniqueKey),
      reference_id: referenceId ?? null,
    });
    if (ins.duplicate) {
      return { duplicate: true, wallet: await ensureWallet(targetUserId) };
    }
    const updated = await syncAuthoritativeWallet(targetUserId, extraWalletFields);
    return { duplicate: false, wallet: updated };
  };

  if (action === 'events') {
    const rows = await db.listTransactions(userId, 50);
    return {
      status: 200,
      body: {
        documents: rows.map((r) => ({
          $id: String(r.id),
          $createdAt: String(r.created_at),
          $updatedAt: String(r.created_at),
          userId: String(r.user_id),
          kind: String(r.kind),
          label: String(r.label),
          coins: Number(r.coins || 0),
          amount: Number(r.amount || 0),
        })),
      },
    };
  }

  if (action === 'withdrawals') {
    const rows = await db.listWithdrawals(userId, 50);
    return {
      status: 200,
      body: {
        documents: rows.map((r) => ({
          $id: String(r.id),
          $createdAt: String(r.created_at),
          $updatedAt: String(r.updated_at || r.created_at),
          userId: String(r.user_id),
          amount: Number(r.amount || 0),
          upiId: String(r.upi_id),
          status: String(r.status),
        })),
      },
    };
  }

  if (action === 'wallet') {
    const w = await syncAuthoritativeWallet(userId);
    return {
      status: 200,
      body: {
        $id: String(w.user_id || userId),
        $createdAt: String(w.created_at || ''),
        $updatedAt: String(w.updated_at || ''),
        coins: Number(w.coins || 0),
        balance: roundMoney(Number(w.balance || 0)),
        streak: Number(w.streak || 0),
        lastCheckIn: (w.last_check_in as string) || null,
        referralCode: (w.referral_code as string) || null,
      },
    };
  }

  if (action === 'check-in') {
    const w = await ensureWallet(userId);
    const today = indiaDateKey(nowMs);
    if (w.last_check_in && indiaDateKey(new Date(String(w.last_check_in)).getTime()) === today) {
      return { status: 200, body: { ok: true, duplicate: true, coins: 0, message: 'Already checked in today.' } };
    }
    const yesterday = indiaDateKey(nowMs - 86_400_000);
    const streak =
      w.last_check_in && indiaDateKey(new Date(String(w.last_check_in)).getTime()) === yesterday ? Number(w.streak || 0) + 1 : 1;
    const credit = await recordCredit(
      userId,
      'check-in',
      'Daily check-in',
      dailyCheckInCoins(streak),
      `check-in:${userId}:${today}`,
      { streak, last_check_in: new Date(nowMs).toISOString() },
    );
    return {
      status: 200,
      body: { ok: true, duplicate: credit.duplicate, coins: credit.duplicate ? 0 : dailyCheckInCoins(streak), streak },
    };
  }

  if (action === 'start-read') {
    const newsId = String(body.newsId || '').trim();
    if (!ARTICLE_ID_REGEX.test(newsId)) {
      return { status: 400, body: { error: 'A valid article is required.' } };
    }
    const article = await db.getApprovedNews(newsId);
    if (!article) {
      return { status: 404, body: { error: 'Article not eligible for reading rewards.' } };
    }
    const payload = `${userId}:${newsId}:${nowMs}`;
    const token = Buffer.from(
      JSON.stringify({ userId, newsId, startedAt: nowMs, sig: signPayload(payload, signingSecret) }),
    ).toString('base64url');
    return { status: 200, body: { token, seconds: REWARD_RULES.READ_SECONDS } };
  }

  if (action === 'read') {
    const verified = verifyReadTicket(body.token, userId, nowMs, signingSecret);
    if (!verified.ok) return { status: 400, body: { error: verified.error } };
    const article = await db.getApprovedNews(verified.newsId);
    if (!article) {
      return { status: 404, body: { error: 'Article not eligible for reading rewards.' } };
    }
    const startOfDay = indiaDayStartIso(nowMs);
    const todayReads = await db.countTransactionsSince(userId, 'read', startOfDay);
    if (todayReads >= REWARD_RULES.MAX_DAILY_READS) {
      return { status: 429, body: { error: 'Daily reading reward limit reached. Come back tomorrow.' } };
    }
    const credit = await recordCredit(
      userId,
      'read',
      'Read article',
      REWARD_RULES.READ_COINS,
      `read:${userId}:${verified.newsId}`,
      {},
      verified.newsId,
    );
    if (!credit.duplicate) {
      await db
        .recordReadActivity({
          user_id: userId,
          activity_type: 'read_reward',
          news_id: article.id,
          title: article.title,
          slug: article.slug,
          image_url: article.image_url ?? null,
          category_name: article.category_name ?? null,
          duration_seconds: verified.elapsedSeconds,
        })
        .catch(() => {});
    }
    return {
      status: 200,
      body: { ok: true, duplicate: credit.duplicate, coins: credit.duplicate ? 0 : REWARD_RULES.READ_COINS },
    };
  }

  if (action === 'apply-referral') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!REFERRAL_CODE_REGEX.test(code)) {
      return { status: 400, body: { error: 'Enter a valid referral code.' } };
    }
    await ensureWallet(userId);
    const result = await db.applyReferralReward({
      refereeId: userId,
      code,
      coins: REWARD_RULES.REFERRAL_COINS,
      amount: roundMoney(REWARD_RULES.REFERRAL_COINS * REWARD_RULES.COIN_RUPEES),
      refereeKey: hashIdempotencyKey(`referral:referee:${userId}`),
      referrerKey: '',
      maxReferrals: REWARD_RULES.MAX_REFERRALS_PER_USER,
    });
    if (result.status === 'not_found') return { status: 404, body: { error: 'Referral code not found.' } };
    if (result.status === 'self') return { status: 400, body: { error: 'You cannot use your own referral code.' } };
    if (result.status === 'already_referred' || result.status === 'duplicate') {
      return { status: 409, body: { error: 'You have already redeemed a referral code.' } };
    }
    if (result.status === 'limit') return { status: 429, body: { error: 'This referral code has reached its reward limit.' } };
    if (result.status !== 'ok' || !result.referrerId) {
      throw new Error('Referral reward could not be completed.');
    }
    await Promise.all([syncAuthoritativeWallet(userId), syncAuthoritativeWallet(result.referrerId)]);
    return { status: 200, body: { ok: true, coins: REWARD_RULES.REFERRAL_COINS, referrerCoins: REWARD_RULES.REFERRAL_COINS } };
  }

  if (action === 'withdraw') {
    const check = validateWithdrawalInput(body);
    if (!check.ok) return { status: 400, body: { error: check.error } };
    const { amount, upiId, requestId } = check;

    const current = await syncAuthoritativeWallet(userId);
    if (roundMoney(Number(current.balance || 0)) < amount) {
      return { status: 400, body: { error: 'Insufficient wallet balance.' } };
    }

    const pendingCount = await db.countPendingWithdrawals(userId);
    if (pendingCount >= REWARD_RULES.MAX_PENDING_WITHDRAWALS) {
      return { status: 429, body: { error: 'You already have pending withdrawal requests awaiting processing.' } };
    }

    const idempotencyKey = buildWithdrawalKey(userId, amount, upiId, requestId, nowMs);
    const ins = await db.insertWithdrawal({
      user_id: userId,
      amount,
      upi_id: upiId,
      status: 'pending',
      idempotency_key: idempotencyKey,
    });
    if (ins.duplicate || !ins.row) {
      return { status: 409, body: { error: 'A matching withdrawal request is already being processed.' } };
    }

    const withdrawalId = String(ins.row.id);
    try {
      const updated = await syncAuthoritativeWallet(userId);
      return {
        status: 200,
        body: {
          ok: true,
          withdrawalId,
          status: 'pending',
          balance: roundMoney(Number(updated.balance || 0)),
        },
      };
    } catch (deductErr) {
      await db.deleteWithdrawal(withdrawalId).catch(() => {});
      throw deductErr;
    }
  }

  return { status: 400, body: { error: 'Unsupported rewards action.' } };
}

export async function rewardsRouteHandler(req: Request, res: Response) {
  try {
    const cfg = getServerSupabaseConfig();
    const signingSecret = getRewardsSigningSecret();
    if (!cfg.configured || !signingSecret) {
      return res.status(503).json({ error: 'Rewards service is not configured.' });
    }

    const auth = await verifySupabaseSession(req.headers.authorization);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const adapter = createSupabaseRewardsAdapter();
    if (!adapter) {
      return res.status(503).json({ error: 'Rewards service is not configured.' });
    }

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const result = await handleRewardsAction(auth.session, body as Record<string, unknown>, {
      db: adapter,
      signingSecret,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[FORWORD rewards] server error:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Rewards service error.' });
  }
}
