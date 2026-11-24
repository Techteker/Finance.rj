import { Client, Account, Databases, ID, Query } from 'node-appwrite';
import crypto from 'node:crypto';

const DB = process.env.APPWRITE_DATABASE_ID || 'newsfeed_main';
const USERS = 'users';
const EVENTS = 'reward_events';
const WITHDRAWALS = 'withdrawals';
const REFERRALS = 'referrals';
const NEWS = 'news';
const SECRET = process.env.REWARDS_SIGNING_SECRET || '';
const CHECKIN_COINS = Math.max(0, Number(process.env.CHECKIN_COINS || 5));
const READ_COINS = Math.max(0, Number(process.env.READ_COINS || 1));
const MIN_WITHDRAWAL = Math.max(500, Number(process.env.MIN_WITHDRAWAL || 500));
// No implicit INR conversion: reward/withdrawal operations remain disabled until
// the owner explicitly configures the approved conversion rate in Appwrite.
const COIN_RUPEES = Number(process.env.COIN_RUPEES);
const READ_SECONDS = Math.max(20, Number(process.env.READ_SECONDS || 20));

const json = (res, status = 200) => ({ statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(res) });
const sign = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const eventId = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const conversionConfigured = Number.isFinite(COIN_RUPEES) && COIN_RUPEES > 0;

export default async ({ req, res, log, error }) => {
  try {
    if (!SECRET) return res.json({ error: 'Rewards service is not configured.' }, 503);

    // The browser explicitly forwards a short-lived JWT minted by Account.createJWT().
    // Do not trust a client-supplied user ID; derive it from the verified Appwrite account.
    const userJwt = req.headers['x-forward-user-jwt'];
    if (!userJwt) return res.json({ error: 'Please sign in again.' }, 401);

    const userClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setJWT(userJwt);
    const account = new Account(userClient);
    const authenticated = await account.get();
    const userId = authenticated.$id;
    if (!userId) return res.json({ error: 'Unauthorized.' }, 401);

    const adminClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY);
    const db = new Databases(adminClient);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action;

    const wallet = async (targetUserId = userId) => {
      try { return await db.getDocument(DB, USERS, targetUserId); }
      catch (e) {
        if (e.code !== 404) throw e;
        const referralCode = 'FW' + String(targetUserId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return await db.createDocument(DB, USERS, targetUserId, {
          name: targetUserId === userId ? (authenticated.name || 'FORWORD User') : 'FORWORD User',
          email: targetUserId === userId ? (authenticated.email || '') : '',
          coins: 0, balance: 0, streak: 0, referralCode
        });
      }
    };
    const recordCredit = async (targetUserId, kind, label, coins, uniqueKey) => {
      requireConversion();
      await wallet(targetUserId);
      const id = eventId('credit:' + targetUserId + ':' + uniqueKey);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const tx = await db.createTransaction({ ttl: 60 });
        try {
          await db.createDocument({
            databaseId: DB, collectionId: EVENTS, documentId: id,
            data: { userId: targetUserId, kind, label, coins }, transactionId: tx.$id
          });
          await db.incrementDocumentAttribute({
            databaseId: DB, collectionId: USERS, documentId: targetUserId,
            attribute: 'coins', value: coins, transactionId: tx.$id
          });
          await db.incrementDocumentAttribute({
            databaseId: DB, collectionId: USERS, documentId: targetUserId,
            attribute: 'balance', value: coins * COIN_RUPEES, transactionId: tx.$id
          });
          await db.updateTransaction({ transactionId: tx.$id, commit: true });
          return { duplicate: false, wallet: await wallet(targetUserId) };
        } catch (e) {
          try { await db.updateTransaction({ transactionId: tx.$id, rollback: true }); } catch {}
          if (e.code === 409) {
            try {
              const existing = await db.getDocument(DB, EVENTS, id);
              if (existing) return { duplicate: true, wallet: await wallet(targetUserId) };
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
    const processReferral = async (submittedCode = '') => {
      const verified = Boolean(authenticated.emailVerification || authenticated.phoneVerification);
      let referral = null;
      const existing = await db.listDocuments(DB, REFERRALS, [
        Query.equal('referredUserId', userId),
        Query.limit(1)
      ]);
      referral = existing.documents[0] || null;

      const code = String(submittedCode || '').trim().toUpperCase();
      if (!referral && code) {
        const ownWallet = await wallet();
        if (code === String(ownWallet.referralCode || '').toUpperCase()) {
          return { status: 'rejected', error: 'Self-referrals are not allowed.' };
        }
        const referrers = await db.listDocuments(DB, USERS, [
          Query.equal('referralCode', code),
          Query.limit(2)
        ]);
        const referrer = referrers.documents[0];
        if (!referrer || referrers.documents.length !== 1) {
          return { status: 'rejected', error: 'Referral code is invalid.' };
        }
        if (referrer.$id === userId) {
          return { status: 'rejected', error: 'Self-referrals are not allowed.' };
        }
        const referralId = eventId('referral-attribution:' + userId);
        try {
          referral = await db.createDocument(DB, REFERRALS, referralId, {
            referrerId: referrer.$id,
            referredUserId: userId,
            referralCode: code,
            status: verified ? 'verified' : 'pending_verification',
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          if (e.code !== 409) throw e;
          referral = await db.getDocument(DB, REFERRALS, referralId);
        }
      }

      if (!referral) return { status: 'none' };
      if (referral.status === 'rewarded') return { status: 'rewarded' };
      if (!verified) return { status: 'pending_verification' };
      if (!conversionConfigured) return { status: 'pending_conversion_config' };

      // Each side uses a deterministic ledger key. Safe retries cannot pay either
      // participant twice if the second credit or final referral update fails.
      await wallet(referral.referrerId);
      await recordCredit(userId, 'referral', 'New user referral bonus', 1000, 'referral:new-user:' + userId);
      await recordCredit(referral.referrerId, 'referral', 'Friend referral bonus', 1000, 'referral:referrer:' + userId);
      await db.updateDocument(DB, REFERRALS, referral.$id, {
        status: 'rewarded',
        rewardedAt: new Date().toISOString()
      });
      return { status: 'rewarded' };
    };

    if (action === 'sync-profile') {
      const current = await wallet();
      const name = String(authenticated.name || '').trim();
      const email = String(authenticated.email || '').trim().toLowerCase();
      const patch = {};
      if (name && current.name !== name) patch.name = name;
      if (email && current.email !== email) patch.email = email;
      if (Object.keys(patch).length) await db.updateDocument(DB, USERS, userId, patch);
      const referral = await processReferral(body.referralCode || '');
      return res.json({
        ok: true,
        profileId: userId,
        referralCode: current.referralCode,
        referral
      });
    }
    if (action === 'events') {
      const result = await db.listDocuments(DB, EVENTS, [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(50)]);
      return res.json({ documents: result.documents });
    }
    if (action === 'referrals') {
      const result = await db.listDocuments(DB, REFERRALS, [
        Query.equal('referrerId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(50)
      ]);
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
      requireConversion();
      const w = await wallet();
      const today = new Date().toISOString().slice(0, 10);
      if (w.lastCheckIn && String(w.lastCheckIn).slice(0, 10) === today) return res.json({ ok: true, duplicate: true, message: 'Already checked in today.' });
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streak = w.lastCheckIn && String(w.lastCheckIn).slice(0, 10) === yesterday ? Number(w.streak || 0) + 1 : 1;
      const credit = await recordCredit(userId, 'check-in', 'Daily check-in', CHECKIN_COINS, 'check-in:' + userId + ':' + today);
      if (!credit.duplicate) await db.updateDocument(DB, USERS, userId, { streak, lastCheckIn: new Date().toISOString() });
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
      requireConversion();
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
      const credit = await recordCredit(userId, 'read', 'Read article', READ_COINS, 'read:' + userId + ':' + ticket.newsId);
      return res.json({ ok: true, duplicate: credit.duplicate, coins: credit.duplicate ? 0 : READ_COINS });
    }
    if (action === 'withdraw') {
      requireConversion();
      const amount = Number(body.amount);
      const upiId = String(body.upiId || '').trim();
      if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL || !/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9-]{2,}$/.test(upiId)) return res.json({ error: 'Enter a valid UPI ID and meet the minimum withdrawal.' }, 400);
      const w = await wallet();
      const coinDebit = Math.ceil(amount / COIN_RUPEES);
      if (Number(w.balance || 0) < amount || Number(w.coins || 0) < coinDebit) return res.json({ error: 'Insufficient wallet balance.' }, 400);
      const tx = await db.createTransaction({ ttl: 60 });
      const withdrawalId = ID.unique();
      try {
        await db.decrementDocumentAttribute({
          databaseId: DB, collectionId: USERS, documentId: userId,
          attribute: 'balance', value: amount, min: 0, transactionId: tx.$id
        });
        await db.decrementDocumentAttribute({
          databaseId: DB, collectionId: USERS, documentId: userId,
          attribute: 'coins', value: coinDebit, min: 0, transactionId: tx.$id
        });
        await db.createDocument({
          databaseId: DB, collectionId: WITHDRAWALS, documentId: withdrawalId,
          data: { userId, amount, upiId, status: 'pending' }, transactionId: tx.$id
        });
        await db.updateTransaction({ transactionId: tx.$id, commit: true });
        return res.json({ ok: true, withdrawalId, status: 'pending' });
      } catch (e) {
        try { await db.updateTransaction({ transactionId: tx.$id, rollback: true }); } catch {}
        if (e.code === 409) return res.json({ error: 'Wallet changed during this request. Please refresh and try again.' }, 409);
        throw e;
      }
    }
    return res.json({ error: 'Unsupported rewards action.' }, 400);
  } catch (e) {
    if (e?.status === 503) return res.json({ error: e.message }, 503);
    error(e?.stack || e?.message || String(e));
    return res.json({ error: e?.message || 'Rewards service error.' }, 500);
  }
};
