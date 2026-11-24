import { Client, Account, Databases, ID, Query } from 'node-appwrite';
import crypto from 'node:crypto';

const DB = process.env.APPWRITE_DATABASE_ID || 'newsfeed_main';
const USERS = 'users';
const EVENTS = 'reward_events';
const WITHDRAWALS = 'withdrawals';
const REFERRALS = 'referrals';
const REFERRAL_COINS = 1000;
const NEWS = 'news';
const SECRET = process.env.REWARDS_SIGNING_SECRET || '';
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

// Daily reward boundaries follow India Standard Time, not the server's UTC date.
const indiaDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

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
        const referralCode = 'FW' + userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return await db.createDocument(DB, USERS, userId, {
          name: authenticated.name || 'FORWORD User', email: authenticated.email || '',
          coins: 0, balance: 0, streak: 0, referralCode
        });
      }
    };
    const recordCredit = async (kind, label, coins, uniqueKey, userUpdates = null) => {
      await wallet();
      const id = eventId(uniqueKey);

      // Keep the idempotency event and wallet credit in one atomic transaction.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const tx = await db.createTransaction({ ttl: 60 });
        try {
          await db.createDocument({
            databaseId: DB,
            collectionId: EVENTS,
            documentId: id,
            data: { userId, kind, label, coins },
            transactionId: tx.$id
          });
          await db.incrementDocumentAttribute({
            databaseId: DB,
            collectionId: USERS,
            documentId: userId,
            attribute: 'coins',
            value: coins,
            transactionId: tx.$id
          });
          await db.incrementDocumentAttribute({
            databaseId: DB,
            collectionId: USERS,
            documentId: userId,
            attribute: 'balance',
            value: coins * COIN_RUPEES,
            transactionId: tx.$id
          });
          if (userUpdates) {
            await db.updateDocument(DB, USERS, userId, userUpdates, undefined, tx.$id);
          }
          await db.updateTransaction({ transactionId: tx.$id, commit: true });
          return { duplicate: false, wallet: await wallet() };
        } catch (e) {
          try { await db.updateTransaction({ transactionId: tx.$id, rollback: true }); } catch {}
          if (e.code === 409) {
            try {
              const existing = await db.getDocument(DB, EVENTS, id);
              if (existing) return { duplicate: true, wallet: await wallet() };
            } catch (lookupError) {
              if (lookupError.code !== 404) throw lookupError;
            }
            if (attempt < 2) continue;
          }
          throw e;
        }
      }
      throw new Error('Could not safely apply reward. Please retry.');
    };

    const attachReferral = async (rawCode) => {
      const code = String(rawCode || '').trim().toUpperCase();
      if (!code || code.length > 64) return null;
      try { return await db.getDocument(DB, REFERRALS, userId); }
      catch (e) { if (e.code !== 404) throw e; }
      const matches = await db.listDocuments(DB, USERS, [Query.equal('referralCode', code), Query.limit(1)]);
      const referrer = matches.documents[0];
      if (!referrer || referrer.$id === userId) return null;
      try {
        return await db.createDocument(DB, REFERRALS, userId, {
          referrerId: referrer.$id,
          referredUserId: userId,
          referralCode: code,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        if (e.code === 409) return await db.getDocument(DB, REFERRALS, userId);
        throw e;
      }
    };

    const rewardReferral = async (referredUserId) => {
      let referral;
      try { referral = await db.getDocument(DB, REFERRALS, referredUserId); }
      catch (e) { if (e.code === 404) return false; throw e; }
      if (referral.status !== 'pending' || referral.referrerId === referredUserId) return false;
      const referrerEventId = eventId('referral:referrer:' + referredUserId);
      const referredEventId = eventId('referral:referred:' + referredUserId);
      const tx = await db.createTransaction({ ttl: 60 });
      try {
        await db.createDocument({
          databaseId: DB, collectionId: EVENTS, documentId: referrerEventId,
          data: { userId: referral.referrerId, kind: 'referral', label: 'Successful referral', coins: REFERRAL_COINS },
          transactionId: tx.$id
        });
        await db.createDocument({
          databaseId: DB, collectionId: EVENTS, documentId: referredEventId,
          data: { userId: referredUserId, kind: 'referral', label: 'Welcome referral bonus', coins: REFERRAL_COINS },
          transactionId: tx.$id
        });
        for (const targetId of [referral.referrerId, referredUserId]) {
          await db.incrementDocumentAttribute({
            databaseId: DB, collectionId: USERS, documentId: targetId,
            attribute: 'coins', value: REFERRAL_COINS, transactionId: tx.$id
          });
          await db.incrementDocumentAttribute({
            databaseId: DB, collectionId: USERS, documentId: targetId,
            attribute: 'balance', value: REFERRAL_COINS * COIN_RUPEES, transactionId: tx.$id
          });
        }
        await db.updateDocument(DB, REFERRALS, referredUserId, {
          status: 'rewarded', rewardedAt: new Date().toISOString()
        }, undefined, tx.$id);
        await db.updateTransaction({ transactionId: tx.$id, commit: true });
        return true;
      } catch (e) {
        try { await db.updateTransaction({ transactionId: tx.$id, rollback: true }); } catch {}
        let latest;
        try { latest = await db.getDocument(DB, REFERRALS, referredUserId); } catch {}
        if (latest?.status === 'rewarded') return false;
        throw e;
      }
    };

    if (action === 'events') {
      const result = await db.listDocuments(DB, EVENTS, [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(50)]);
      return res.json({ documents: result.documents });
    }
    if (action === 'withdrawals') {
      const result = await db.listDocuments(DB, WITHDRAWALS, [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(50)]);
      return res.json({ documents: result.documents });
    }
    if (action === 'referrals') {
      const [sent, received] = await Promise.all([
        db.listDocuments(DB, REFERRALS, [Query.equal('referrerId', userId), Query.orderDesc('$createdAt'), Query.limit(100)]),
        db.listDocuments(DB, REFERRALS, [Query.equal('referredUserId', userId), Query.orderDesc('$createdAt'), Query.limit(100)])
      ]);
      const unique = new Map([...sent.documents, ...received.documents].map((item) => [item.$id, item]));
      return res.json({ documents: [...unique.values()] });
    }

    if (action === 'wallet') {
      const w = await wallet();
      if (body.referralCode) await attachReferral(body.referralCode);
      return res.json({ coins: w.coins || 0, balance: w.balance || 0, streak: w.streak || 0, lastCheckIn: w.lastCheckIn || null, referralCode: w.referralCode || null });
    }

    if (action === 'check-in') {
      const w = await wallet();
      const today = indiaDate();
      if (w.lastCheckIn && String(w.lastCheckIn).slice(0, 10) === today) {
        return res.json({ ok: true, duplicate: true, message: 'Already checked in today.' });
      }
      const yesterday = indiaDate(new Date(Date.now() - 86400000));
      const streak = w.lastCheckIn && String(w.lastCheckIn).slice(0, 10) === yesterday ? Number(w.streak || 0) + 1 : 1;
      // Persist the streak and last-check-in date in the same transaction as the reward.
      const credit = await recordCredit(
        'check-in',
        'Daily check-in',
        CHECKIN_COINS,
        'check-in:' + userId + ':' + today,
        { streak, lastCheckIn: today }
      );
      return res.json({ ok: true, duplicate: credit.duplicate, coins: credit.duplicate ? 0 : CHECKIN_COINS });
    }

    if (action === 'start-read') {
      const newsId = String(body.newsId || '');
      if (!newsId || newsId.length > 36) return res.json({ error: 'A valid article is required.' }, 400);
      const article = await db.getDocument(DB, NEWS, newsId);
      if (article.status !== 'approved') return res.json({ error: 'This article is not eligible for rewards.' }, 403);
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
      const article = await db.getDocument(DB, NEWS, ticket.newsId);
      if (article.status !== 'approved') return res.json({ error: 'This article is not eligible for rewards.' }, 403);
      const elapsed = Date.now() - Number(ticket.startedAt);
      if (!Number.isFinite(elapsed) || elapsed < READ_SECONDS * 1000) return res.json({ error: 'Please finish the reading timer first.' }, 400);
      if (elapsed > 30 * 60 * 1000) return res.json({ error: 'Reading session expired. Start again.' }, 400);
      const credit = await recordCredit('read', 'Read article', READ_COINS, 'read:' + userId + ':' + ticket.newsId);
      const referralRewarded = await rewardReferral(userId);
      return res.json({ ok: true, duplicate: credit.duplicate, coins: credit.duplicate ? 0 : READ_COINS, referralRewarded });
    }

    if (action === 'withdraw') {
      const amount = Number(body.amount);
      const upiId = String(body.upiId || '').trim();
      if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL || !/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9-]{2,}$/.test(upiId)) {
        return res.json({ error: 'Enter a valid UPI ID and meet the minimum withdrawal.' }, 400);
      }
      const w = await wallet();
      if (Number(w.balance || 0) < amount) return res.json({ error: 'Insufficient wallet balance.' }, 400);

      // Debit and withdrawal request commit together. The atomic decrement enforces
      // a zero floor, so concurrent requests cannot spend the same balance twice.
      const tx = await db.createTransaction({ ttl: 60 });
      const withdrawalId = ID.unique();
      try {
        await db.decrementDocumentAttribute({
          databaseId: DB,
          collectionId: USERS,
          documentId: userId,
          attribute: 'balance',
          value: amount,
          min: 0,
          transactionId: tx.$id
        });
        await db.createDocument({
          databaseId: DB,
          collectionId: WITHDRAWALS,
          documentId: withdrawalId,
          data: { userId, amount, upiId, status: 'pending' },
          transactionId: tx.$id
        });
        await db.updateTransaction({ transactionId: tx.$id, commit: true });
        // Request only: no payment is sent by this function. Admin must review and pay manually.
        return res.json({ ok: true, withdrawalId, status: 'pending' });
      } catch (e) {
        try { await db.updateTransaction({ transactionId: tx.$id, rollback: true }); } catch {}
        if (e.code === 409) return res.json({ error: 'Wallet changed during this request. Please refresh and try again.' }, 409);
        throw e;
      }
    }

    return res.json({ error: 'Unsupported rewards action.' }, 400);
  } catch (e) {
    error(e?.stack || e?.message || String(e));
    return res.json({ error: e?.message || 'Rewards service error.' }, 500);
  }
};
