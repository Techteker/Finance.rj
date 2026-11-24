import { Client, Account, Databases, ID, Query } from 'node-appwrite';
import crypto from 'node:crypto';

const DB = process.env.APPWRITE_DATABASE_ID || 'newsfeed_main';
const USERS = 'users';
const EVENTS = 'reward_events';
const WITHDRAWALS = 'withdrawals';
const SECRET = process.env.REWARDS_SIGNING_SECRET || process.env.APPWRITE_FUNCTION_API_KEY || '';
const CHECKIN_COINS = Math.max(0, Number(process.env.CHECKIN_COINS || 5));
const READ_COINS = Math.max(0, Number(process.env.READ_COINS || 1));
const MIN_WITHDRAWAL = Math.max(500, Number(process.env.MIN_WITHDRAWAL || 500));
const COIN_RUPEES = Math.max(0.0001, Number(process.env.COIN_RUPEES || 0.01));
const READ_SECONDS = Math.max(20, Number(process.env.READ_SECONDS || 20));

const json = (res, status = 200) => ({ statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(res) });
const sign = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const eventId = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);

export default async ({ req, res, log, error }) => {
  try {
    if (!SECRET) return res.json({ error: 'Rewards service is not configured.' }, 503);
    const userId = req.headers['x-appwrite-user-id'];
    const userJwt = req.headers['x-appwrite-user-jwt'];
    if (!userId || !userJwt) return res.json({ error: 'Please sign in again.' }, 401);

    // Verify the caller's JWT before using the server API key.
    const userClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setJWT(userJwt);
    const account = new Account(userClient);
    const authenticated = await account.get();
    if (authenticated.$id !== userId) return res.json({ error: 'Unauthorized.' }, 401);

    const adminClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY);
    const db = new Databases(adminClient);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action;

    const wallet = async () => {
      try { return await db.getDocument(DB, USERS, userId); }
      catch (e) {
        if (e.code !== 404) throw e;
        const referralCode = 'FW' + userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
        return await db.createDocument(DB, USERS, userId, {
          name: authenticated.name || 'FORWORD User', email: authenticated.email || '',
          coins: 0, balance: 0, streak: 0, referralCode
        });
      }
    };
    const recordCredit = async (kind, label, coins, uniqueKey) => {
      const w = await wallet();
      const id = eventId(uniqueKey);
      try {
        await db.createDocument(DB, EVENTS, id, { userId, kind, label, coins });
      } catch (e) {
        if (e.code === 409) return { duplicate: true, wallet: w };
        throw e;
      }
      const nextCoins = Number(w.coins || 0) + coins;
      const nextBalance = Number(w.balance || 0) + coins * COIN_RUPEES;
      const updated = await db.updateDocument(DB, USERS, userId, { coins: nextCoins, balance: nextBalance });
      return { duplicate: false, wallet: updated };
    };

    if (action === 'events') {
      const result = await db.listDocuments(DB, EVENTS, [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(50)]);
      return res.json({ documents: result.documents });
    }
    if (action === 'withdrawals') {
      const result = await db.listDocuments(DB, WITHDRAWALS, [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(50)]);
      return res.json({ documents: result.documents });
    }

    if (action === 'wallet') {
      const w = await wallet();
      return res.json({ coins: w.coins || 0, balance: w.balance || 0, streak: w.streak || 0, lastCheckIn: w.lastCheckIn || null, referralCode: w.referralCode || null });
    }

    if (action === 'check-in') {
      const w = await wallet();
      const today = new Date().toISOString().slice(0, 10);
      if (w.lastCheckIn && String(w.lastCheckIn).slice(0, 10) === today) {
        return res.json({ ok: true, duplicate: true, message: 'Already checked in today.' });
      }
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streak = w.lastCheckIn && String(w.lastCheckIn).slice(0, 10) === yesterday ? Number(w.streak || 0) + 1 : 1;
      const credit = await recordCredit('check-in', 'Daily check-in', CHECKIN_COINS, 'check-in:' + userId + ':' + today);
      if (!credit.duplicate) await db.updateDocument(DB, USERS, userId, { streak, lastCheckIn: new Date().toISOString() });
      return res.json({ ok: true, duplicate: credit.duplicate, coins: CHECKIN_COINS });
    }

    if (action === 'start-read') {
      const newsId = String(body.newsId || '');
      if (!newsId || newsId.length > 36) return res.json({ error: 'A valid article is required.' }, 400);
      const now = Date.now();
      const payload = userId + ':' + newsId + ':' + now;
      const token = Buffer.from(JSON.stringify({ userId, newsId, startedAt: now, sig: sign(payload) })).toString('base64url');
      return res.json({ token, seconds: READ_SECONDS });
    }

    if (action === 'read') {
      const token = String(body.token || '');
      let ticket;
      try { ticket = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')); } catch { return res.json({ error: 'Invalid reading session.' }, 400); }
      const payload = ticket.userId + ':' + ticket.newsId + ':' + ticket.startedAt;
      if (ticket.userId !== userId || !ticket.newsId || !safeEqual(ticket.sig, sign(payload))) return res.json({ error: 'Invalid reading session.' }, 400);
      const elapsed = Date.now() - Number(ticket.startedAt);
      if (!Number.isFinite(elapsed) || elapsed < READ_SECONDS * 1000) return res.json({ error: 'Please finish the reading timer first.' }, 400);
      if (elapsed > 30 * 60 * 1000) return res.json({ error: 'Reading session expired. Start again.' }, 400);
      const credit = await recordCredit('read', 'Read article', READ_COINS, 'read:' + userId + ':' + ticket.newsId);
      return res.json({ ok: true, duplicate: credit.duplicate, coins: credit.duplicate ? 0 : READ_COINS });
    }

    if (action === 'withdraw') {
      const amount = Number(body.amount);
      const upiId = String(body.upiId || '').trim();
      if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL || !/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9-]{2,}$/.test(upiId)) {
        return res.json({ error: 'Enter a valid UPI ID and meet the minimum withdrawal.' }, 400);
      }
      const w = await wallet();
      if (Number(w.balance || 0) < amount) return res.json({ error: 'Insufficient wallet balance.' }, 400);
      // Request only: no payment is sent by this function. Admin must review and pay manually.
      const withdrawal = await db.createDocument(DB, WITHDRAWALS, ID.unique(), { userId, amount, upiId, status: 'pending' });
      await db.updateDocument(DB, USERS, userId, { balance: Number(w.balance) - amount });
      return res.json({ ok: true, withdrawalId: withdrawal.$id, status: 'pending' });
    }

    return res.json({ error: 'Unsupported rewards action.' }, 400);
  } catch (e) {
    error(e?.stack || e?.message || String(e));
    return res.json({ error: e?.message || 'Rewards service error.' }, 500);
  }
};
