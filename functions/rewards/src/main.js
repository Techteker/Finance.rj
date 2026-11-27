import { Client, Account, Databases, Query } from 'node-appwrite';
import crypto from 'node:crypto';

const NEWS = 'news';
const USERS = 'users';
const EVENTS = 'reward_events';
const WITHDRAWALS = 'withdrawals';
const CHECKIN_COINS = Math.max(0, Number(process.env.CHECKIN_COINS || 5));
const READ_COINS = Math.max(0, Number(process.env.READ_COINS || 1));
const REFERRAL_COINS = Math.max(0, Number(process.env.REFERRAL_COINS || 25));
const MAX_DAILY_READS = Math.max(1, Number(process.env.MAX_DAILY_READS || 20));
const MAX_REFERRALS_PER_USER = Math.max(1, Number(process.env.MAX_REFERRALS_PER_USER || 50));
const MAX_PENDING_WITHDRAWALS = Math.max(1, Number(process.env.MAX_PENDING_WITHDRAWALS || 3));
const MIN_WITHDRAWAL = Math.max(1, Number(process.env.MIN_WITHDRAWAL || 100));
const MAX_WITHDRAWAL = Math.max(MIN_WITHDRAWAL, Number(process.env.MAX_WITHDRAWAL || 100000));
const COIN_RUPEES = Math.max(0.0001, Number(process.env.COIN_RUPEES || 0.01));
const READ_SECONDS = Math.max(20, Number(process.env.READ_SECONDS || 20));
const MAX_BODY_BYTES = 16 * 1024;
const UPI_REGEX = /^[\w.-]{2,64}@[a-zA-Z0-9]{2,32}$/;
const DOC_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;
const REFERRAL_CODE_REGEX = /^FW[A-Z0-9]{6,12}$/;

// In-memory sliding-window limiter for warm function containers (complements DB uniqueness & caps).
const rateBuckets = new Map();

export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const eventId = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32);

export function getHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return '';
  const target = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) return typeof v === 'string' ? v.trim() : '';
  }
  return '';
}

export function checkRateLimit(key, limit = 30, windowMs = 60_000, nowMs = Date.now(), store = rateBuckets) {
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

export function parseRequestBody(rawBody, maxBytes = MAX_BODY_BYTES) {
  if (rawBody == null || rawBody === '') return { ok: true, data: {} };
  if (typeof rawBody === 'object' && !Array.isArray(rawBody)) {
    const size = Buffer.byteLength(JSON.stringify(rawBody), 'utf8');
    if (size > maxBytes) return { ok: false, status: 413, error: 'Request payload is too large.' };
    return { ok: true, data: rawBody };
  }
  if (typeof rawBody !== 'string') return { ok: false, status: 400, error: 'Invalid request body.' };
  if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) {
    return { ok: false, status: 413, error: 'Request payload is too large.' };
  }
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: 'Invalid request body.' };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, status: 400, error: 'Malformed JSON payload.' };
  }
}

export function validateWithdrawalInput(body, minWithdrawal = MIN_WITHDRAWAL, maxWithdrawal = MAX_WITHDRAWAL) {
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

export function buildWithdrawalId(userId, amount, upiId, requestId = '', nowMs = Date.now()) {
  if (requestId) return eventId(`withdraw:${userId}:${requestId}`);
  const minuteBucket = Math.floor(nowMs / 60000);
  return eventId(`withdraw:${userId}:${roundMoney(amount)}:${upiId.toLowerCase()}:${minuteBucket}`);
}

function getServerSecrets() {
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
  const signingSecret = process.env.REWARDS_SIGNING_SECRET || apiKey;
  const databaseId = (process.env.APPWRITE_DATABASE_ID || '').trim();
  return { apiKey, signingSecret, databaseId };
}

export function deriveSigningKey(secret = getServerSecrets().signingSecret) {
  return crypto.createHash('sha256').update(`forword:rewards-hmac:v1:${secret}`).digest();
}

export function signPayload(value, secret = getServerSecrets().signingSecret) {
  return crypto.createHmac('sha256', deriveSigningKey(secret)).update(String(value)).digest('hex');
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function verifyReadTicket(token, expectedUserId, nowMs = Date.now(), secret = getServerSecrets().signingSecret, readSeconds = READ_SECONDS) {
  if (typeof token !== 'string' || !token || token.length > 1024) {
    return { ok: false, error: 'Invalid reading session.' };
  }
  let ticket;
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
    !DOC_ID_REGEX.test(ticket.newsId)
  ) {
    return { ok: false, error: 'Invalid reading session.' };
  }
  const payload = `${ticket.userId}:${ticket.newsId}:${ticket.startedAt}`;
  if (ticket.userId !== expectedUserId || !safeEqual(ticket.sig, signPayload(payload, secret))) {
    return { ok: false, error: 'Invalid reading session.' };
  }
  const elapsed = nowMs - ticket.startedAt;
  if (!Number.isFinite(elapsed) || elapsed < readSeconds * 1000) {
    return { ok: false, error: 'Please finish the reading timer first.' };
  }
  if (elapsed > 30 * 60 * 1000) {
    return { ok: false, error: 'Reading session expired. Start again.' };
  }
  return { ok: true, newsId: ticket.newsId };
}

export default async ({ req, res, error }, _deps = {}) => {
  const {
    Client: ClientCtor = Client,
    Account: AccountCtor = Account,
    Databases: DatabasesCtor = Databases,
    Query: QueryUtil = Query,
    rateStore = rateBuckets,
    nowFn = Date.now,
  } = _deps;

  try {
    const { apiKey, signingSecret, databaseId: DB } = getServerSecrets();
    if (!apiKey || !signingSecret || !DB || !process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID) {
      return res.json({ error: 'Rewards service is not configured.' }, 503);
    }

    const method = String(req?.method || 'POST').toUpperCase();
    if (method !== 'POST') {
      return res.json({ error: 'Method not allowed.' }, 405);
    }

    const userId = getHeader(req.headers, 'x-appwrite-user-id');
    const userJwt = getHeader(req.headers, 'x-appwrite-user-jwt');
    if (!userId || !userJwt) return res.json({ error: 'Please sign in again.' }, 401);

    const parsed = parseRequestBody(req.body);
    if (!parsed.ok) return res.json({ error: parsed.error }, parsed.status || 400);
    const body = parsed.data;
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    // Verify the caller's JWT before using the server API key.
    const userClient = new ClientCtor()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setJWT(userJwt);
    const account = new AccountCtor(userClient);
    let authenticated;
    try {
      authenticated = await account.get();
    } catch {
      return res.json({ error: 'Session expired. Please sign in again.' }, 401);
    }
    if (authenticated.$id !== userId) return res.json({ error: 'Unauthorized.' }, 401);

    const nowMs = nowFn();
    const rateLimit = action === 'withdraw' || action === 'apply-referral' ? 5 : action === 'check-in' ? 10 : 40;
    const rl = checkRateLimit(`${userId}:${action || 'unknown'}`, rateLimit, 60_000, nowMs, rateStore);
    if (!rl.allowed) {
      return res.json({ error: 'Too many requests. Please wait a moment and try again.' }, 429);
    }

    const adminClient = new ClientCtor()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(apiKey);
    const db = new DatabasesCtor(adminClient);

    const wallet = async (targetUserId = userId) => {
      try {
        return await db.getDocument(DB, USERS, targetUserId);
      } catch (e) {
        if (e.code !== 404 || targetUserId !== userId) throw e;
        const referralCode = 'FW' + userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
        try {
          return await db.createDocument(DB, USERS, userId, {
            name: authenticated.name || 'FORWORD User', email: authenticated.email || '',
            coins: 0, balance: 0, streak: 0, referralCode,
          });
        } catch (createErr) {
          if (createErr.code === 409) return await db.getDocument(DB, USERS, userId);
          throw createErr;
        }
      }
    };

    const verifyApprovedArticle = async (newsId) => {
      try {
        const doc = await db.getDocument(DB, NEWS, newsId);
        return doc && doc.status === 'approved';
      } catch (e) {
        if (e.code === 404) return false;
        throw e;
      }
    };

    const recordCredit = async (targetUserId, kind, label, coins, uniqueKey, extraUserFields = {}) => {
      const id = eventId(uniqueKey);
      try {
        await db.createDocument(DB, EVENTS, id, { userId: targetUserId, kind, label, coins });
      } catch (e) {
        if (e.code === 409) return { duplicate: true, wallet: await wallet(targetUserId) };
        throw e;
      }
      // Always read the latest wallet snapshot after reserving the unique event ID.
      const fresh = await wallet(targetUserId);
      const nextCoins = Math.max(0, Math.round(Number(fresh.coins || 0)) + coins);
      const nextBalance = roundMoney(Number(fresh.balance || 0) + coins * COIN_RUPEES);
      const updated = await db.updateDocument(DB, USERS, targetUserId, { coins: nextCoins, balance: nextBalance, ...extraUserFields });
      return { duplicate: false, wallet: updated };
    };

    if (action === 'events') {
      const result = await db.listDocuments(DB, EVENTS, [QueryUtil.equal('userId', userId), QueryUtil.orderDesc('$createdAt'), QueryUtil.limit(50)]);
      return res.json({ documents: result.documents });
    }
    if (action === 'withdrawals') {
      const result = await db.listDocuments(DB, WITHDRAWALS, [QueryUtil.equal('userId', userId), QueryUtil.orderDesc('$createdAt'), QueryUtil.limit(50)]);
      return res.json({ documents: result.documents });
    }

    if (action === 'wallet') {
      const w = await wallet();
      return res.json({
        coins: w.coins || 0,
        balance: roundMoney(w.balance || 0),
        streak: w.streak || 0,
        lastCheckIn: w.lastCheckIn || null,
        referralCode: w.referralCode || null,
      });
    }

    if (action === 'check-in') {
      const w = await wallet();
      const today = new Date(nowMs).toISOString().slice(0, 10);
      if (w.lastCheckIn && String(w.lastCheckIn).slice(0, 10) === today) {
        return res.json({ ok: true, duplicate: true, coins: 0, message: 'Already checked in today.' });
      }
      const yesterday = new Date(nowMs - 86400000).toISOString().slice(0, 10);
      const streak = w.lastCheckIn && String(w.lastCheckIn).slice(0, 10) === yesterday ? Number(w.streak || 0) + 1 : 1;
      const credit = await recordCredit(userId, 'check-in', 'Daily check-in', CHECKIN_COINS, 'check-in:' + userId + ':' + today, {
        streak,
        lastCheckIn: new Date(nowMs).toISOString(),
      });
      return res.json({ ok: true, duplicate: credit.duplicate, coins: credit.duplicate ? 0 : CHECKIN_COINS });
    }

    if (action === 'start-read') {
      const newsId = String(body.newsId || '').trim();
      if (!DOC_ID_REGEX.test(newsId)) {
        return res.json({ error: 'A valid article is required.' }, 400);
      }
      if (!(await verifyApprovedArticle(newsId))) {
        return res.json({ error: 'Article not eligible for reading rewards.' }, 404);
      }
      const payload = `${userId}:${newsId}:${nowMs}`;
      const token = Buffer.from(JSON.stringify({ userId, newsId, startedAt: nowMs, sig: signPayload(payload, signingSecret) })).toString('base64url');
      return res.json({ token, seconds: READ_SECONDS });
    }

    if (action === 'read') {
      const verified = verifyReadTicket(body.token, userId, nowMs, signingSecret);
      if (!verified.ok) return res.json({ error: verified.error }, 400);
      if (!(await verifyApprovedArticle(verified.newsId))) {
        return res.json({ error: 'Article not eligible for reading rewards.' }, 404);
      }
      const startOfDay = `${new Date(nowMs).toISOString().slice(0, 10)}T00:00:00.000Z`;
      const todayReads = await db.listDocuments(DB, EVENTS, [
        QueryUtil.equal('userId', userId),
        QueryUtil.equal('kind', 'read'),
        QueryUtil.greaterThanEqual('$createdAt', startOfDay),
        QueryUtil.limit(MAX_DAILY_READS),
      ]);
      if (todayReads.documents.length >= MAX_DAILY_READS) {
        return res.json({ error: 'Daily reading reward limit reached. Come back tomorrow.' }, 429);
      }
      const credit = await recordCredit(userId, 'read', 'Read article', READ_COINS, 'read:' + userId + ':' + verified.newsId);
      return res.json({ ok: true, duplicate: credit.duplicate, coins: credit.duplicate ? 0 : READ_COINS });
    }

    if (action === 'apply-referral') {
      const code = String(body.code || '').trim().toUpperCase();
      if (!REFERRAL_CODE_REGEX.test(code)) {
        return res.json({ error: 'Enter a valid referral code.' }, 400);
      }
      await wallet(userId);
      const matches = await db.listDocuments(DB, USERS, [
        QueryUtil.equal('referralCode', code),
        QueryUtil.limit(1),
      ]);
      const referrer = matches.documents[0];
      if (!referrer) {
        return res.json({ error: 'Referral code not found.' }, 404);
      }
      if (referrer.$id === userId) {
        return res.json({ error: 'You cannot use your own referral code.' }, 400);
      }
      const referrerCount = await db.listDocuments(DB, EVENTS, [
        QueryUtil.equal('userId', referrer.$id),
        QueryUtil.equal('kind', 'referral'),
        QueryUtil.limit(MAX_REFERRALS_PER_USER),
      ]);
      if (referrerCount.documents.length >= MAX_REFERRALS_PER_USER) {
        return res.json({ error: 'This referral code has reached its reward limit.' }, 429);
      }
      const refereeCredit = await recordCredit(
        userId,
        'referral',
        'Referral welcome bonus',
        REFERRAL_COINS,
        'referral:referee:' + userId,
      );
      if (refereeCredit.duplicate) {
        return res.json({ error: 'You have already redeemed a referral code.' }, 409);
      }
      await recordCredit(
        referrer.$id,
        'referral',
        'Referral bonus',
        REFERRAL_COINS,
        'referral:referrer:' + referrer.$id + ':' + userId,
      );
      return res.json({ ok: true, coins: REFERRAL_COINS });
    }

    if (action === 'withdraw') {
      const check = validateWithdrawalInput(body);
      if (!check.ok) return res.json({ error: check.error }, 400);
      const { amount, upiId, requestId } = check;
      const w = await wallet();
      const currentBalance = roundMoney(w.balance || 0);
      if (currentBalance < amount) return res.json({ error: 'Insufficient wallet balance.' }, 400);

      const pending = await db.listDocuments(DB, WITHDRAWALS, [
        QueryUtil.equal('userId', userId),
        QueryUtil.equal('status', 'pending'),
        QueryUtil.limit(MAX_PENDING_WITHDRAWALS),
      ]);
      if (pending.documents.length >= MAX_PENDING_WITHDRAWALS) {
        return res.json({ error: 'You already have pending withdrawal requests awaiting processing.' }, 429);
      }

      const withdrawalId = buildWithdrawalId(userId, amount, upiId, requestId, nowMs);
      let withdrawal;
      try {
        // Reserve a deterministic request ID first to block rapid duplicate submissions.
        withdrawal = await db.createDocument(DB, WITHDRAWALS, withdrawalId, { userId, amount, upiId, status: 'pending' });
      } catch (e) {
        if (e.code === 409) return res.json({ error: 'A matching withdrawal request is already being processed.' }, 409);
        throw e;
      }

      try {
        const fresh = await wallet();
        const freshBalance = roundMoney(fresh.balance || 0);
        const nextBalance = roundMoney(freshBalance - amount);
        if (nextBalance < 0) {
          await db.deleteDocument(DB, WITHDRAWALS, withdrawal.$id).catch(() => {});
          return res.json({ error: 'Insufficient wallet balance.' }, 400);
        }
        await db.updateDocument(DB, USERS, userId, { balance: nextBalance });
        return res.json({ ok: true, withdrawalId: withdrawal.$id, status: 'pending', balance: nextBalance });
      } catch (deductErr) {
        await db.deleteDocument(DB, WITHDRAWALS, withdrawal.$id).catch(() => {});
        throw deductErr;
      }
    }

    return res.json({ error: 'Unsupported rewards action.' }, 400);
  } catch (e) {
    error(e?.stack || e?.message || String(e));
    return res.json({ error: 'Rewards service error.' }, 500);
  }
};
