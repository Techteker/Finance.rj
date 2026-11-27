import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { safeInternalPath, safeMediaUrl, safeUrl, shortDate, timeAgo } from './format';
import { ApiError, clearApiCache, formatApiError, isNotFoundError, isOfferActive, runCached } from './api';
import { resolveAbsoluteUrl } from './seo';
import rewardsHandler, {
  buildWithdrawalId,
  checkRateLimit,
  deriveSigningKey,
  getHeader,
  parseRequestBody,
  roundMoney,
  signPayload,
  validateWithdrawalInput,
  verifyReadTicket,
} from '../../functions/rewards/src/main.js';

test('safeUrl only permits http and https outbound URLs', () => {
  assert.equal(safeUrl('https://forword.in/news'), 'https://forword.in/news');
  assert.equal(safeUrl('http://example.com/path?a=1'), 'http://example.com/path?a=1');
  assert.equal(safeUrl('javascript:alert(1)'), undefined);
  assert.equal(safeUrl('  javascript:void(0)  '), undefined);
  assert.equal(safeUrl('data:text/html,<script>alert(1)</script>'), undefined);
  assert.equal(safeUrl('vbscript:msgbox(1)'), undefined);
  assert.equal(safeUrl('/relative/path'), undefined);
});

test('safeInternalPath blocks external, protocol-relative, backslash, and control-char redirects', () => {
  assert.equal(safeInternalPath('/news/rbi-repo-rate'), '/news/rbi-repo-rate');
  assert.equal(safeInternalPath('/compare?ids=a,b#fees'), '/compare?ids=a,b#fees');
  assert.equal(safeInternalPath('//evil.com/phish'), undefined);
  assert.equal(safeInternalPath('/\\evil.com/phish'), undefined);
  assert.equal(safeInternalPath('\\\\evil.com'), undefined);
  assert.equal(safeInternalPath('https://evil.com/login'), undefined);
  assert.equal(safeInternalPath('javascript:alert(1)'), undefined);
  assert.equal(safeInternalPath('/news\r\nSet-Cookie: a=b'), undefined);
  assert.equal(safeInternalPath(''), undefined);
});

test('safeMediaUrl allows safe https URLs and local paths while blocking scripts', () => {
  assert.equal(safeMediaUrl('https://cdn.forword.in/thumb.jpg'), 'https://cdn.forword.in/thumb.jpg');
  assert.equal(safeMediaUrl('/og-image.jpg'), '/og-image.jpg');
  assert.equal(safeMediaUrl('javascript:alert(1)'), undefined);
  assert.equal(safeMediaUrl('data:image/svg+xml,<svg onload=alert(1)>'), undefined);
  assert.equal(safeMediaUrl('//evil.com/img.png'), undefined);
});

test('shortDate and timeAgo safely handle malformed date inputs', () => {
  assert.equal(shortDate('not-a-date'), 'Not available');
  assert.equal(shortDate(''), 'Not available');
  assert.equal(timeAgo('not-a-date'), '');
  assert.equal(timeAgo(undefined), '');
  assert.match(shortDate('2026-11-24T10:00:00Z'), /2026/);
});

test('isOfferActive keeps date-only offers valid through end of day UTC', () => {
  const midday = new Date('2026-11-24T12:00:00Z').getTime();
  const nextDay = new Date('2026-11-25T00:00:01Z').getTime();
  assert.equal(isOfferActive('2026-11-24', midday), true);
  assert.equal(isOfferActive('2026-11-24', nextDay), false);
  assert.equal(isOfferActive(undefined, midday), true);
});

test('rewards backend helpers validate JSON, payload limits, money rounding, UPI, and idempotent withdrawal IDs', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(100.005), 100.01);

  assert.equal(parseRequestBody('{bad json').ok, false);
  assert.equal(parseRequestBody('[]').ok, false);
  const big = parseRequestBody('{"a":"' + 'x'.repeat(20_000) + '"}');
  assert.equal(big.ok, false);
  assert.equal(big.status, 413);
  assert.deepEqual(parseRequestBody('{"action":"wallet"}'), { ok: true, data: { action: 'wallet' } });

  assert.equal(validateWithdrawalInput({ amount: -50, upiId: 'user@upi' }, 100, 100000).ok, false);
  assert.equal(validateWithdrawalInput({ amount: 50, upiId: 'user@upi' }, 100, 100000).ok, false);
  assert.equal(validateWithdrawalInput({ amount: 250, upiId: 'bad upi' }, 100, 100000).ok, false);
  const valid = validateWithdrawalInput({ amount: 250.5, upiId: 'rahul.k@okhdfcbank', requestId: 'req-123' }, 100, 100000);
  assert.equal(valid.ok, true);

  const id1 = buildWithdrawalId('u1', 250, 'rahul@upi', 'req-123');
  const id2 = buildWithdrawalId('u1', 250, 'rahul@upi', 'req-123');
  const id3 = buildWithdrawalId('u1', 250, 'rahul@upi', 'req-456');
  assert.equal(id1, id2);
  assert.notEqual(id1, id3);
  assert.equal(id1.length, 32);
});

test('rewards HMAC read tickets block forgery, cross-user replay, premature claims, expiry, and invalid news IDs', () => {
  const secret = 'test-signing-secret-32bytes-minimum';
  const key = deriveSigningKey(secret);
  assert.equal(Buffer.isBuffer(key), true);
  assert.equal(key.length, 32);

  const startedAt = 1_700_000_000_000;
  const makeToken = (userId: string, newsId: string, ts: number, sigOverride?: string) => {
    const payload = `${userId}:${newsId}:${ts}`;
    const sig = sigOverride ?? signPayload(payload, secret);
    return Buffer.from(JSON.stringify({ userId, newsId, startedAt: ts, sig })).toString('base64url');
  };

  const validToken = makeToken('user_a', 'article_123', startedAt);
  // Premature claim (only 10s elapsed)
  assert.equal(verifyReadTicket(validToken, 'user_a', startedAt + 10_000, secret, 20).ok, false);
  // Valid claim (25s elapsed)
  assert.deepEqual(verifyReadTicket(validToken, 'user_a', startedAt + 25_000, secret, 20), { ok: true, newsId: 'article_123' });
  // Cross-user replay
  assert.equal(verifyReadTicket(validToken, 'user_b', startedAt + 25_000, secret, 20).ok, false);
  // Tampered signature
  const forged = makeToken('user_a', 'article_123', startedAt, '0'.repeat(64));
  assert.equal(verifyReadTicket(forged, 'user_a', startedAt + 25_000, secret, 20).ok, false);
  // Expired (> 30 min)
  assert.equal(verifyReadTicket(validToken, 'user_a', startedAt + 31 * 60_000, secret, 20).ok, false);
  // Path-traversal / invalid newsId
  const badNewsId = makeToken('user_a', '../etc/passwd', startedAt);
  assert.equal(verifyReadTicket(badNewsId, 'user_a', startedAt + 25_000, secret, 20).ok, false);
  // Oversized token
  assert.equal(verifyReadTicket('a'.repeat(2000), 'user_a', startedAt + 25_000, secret, 20).ok, false);
});

test('rewards rate limiter and case-insensitive header lookup work reliably', () => {
  assert.equal(getHeader({ 'X-Appwrite-User-Id': '  u123  ' }, 'x-appwrite-user-id'), 'u123');
  assert.equal(getHeader(null, 'x-appwrite-user-id'), '');

  const store = new Map<string, number[]>();
  const t0 = 1_700_000_000_000;
  assert.equal(checkRateLimit('u1:withdraw', 2, 60_000, t0, store).allowed, true);
  assert.equal(checkRateLimit('u1:withdraw', 2, 60_000, t0 + 1000, store).allowed, true);
  const blocked = checkRateLimit('u1:withdraw', 2, 60_000, t0 + 2000, store);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  // After sliding window expires
  assert.equal(checkRateLimit('u1:withdraw', 2, 60_000, t0 + 61_000, store).allowed, true);
});

test('rewards handler fails closed on missing config, non-POST, missing auth, oversized payload, and malformed JSON', async () => {
  const prev = {
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
    APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
    REWARDS_SIGNING_SECRET: process.env.REWARDS_SIGNING_SECRET,
  };
  const makeRes = () => ({
    json: (body: unknown, status = 200) => ({ body, status }),
  });
  const noopErr = () => {};

  try {
    // 1. Missing config -> 503 fail-closed
    delete process.env.APPWRITE_ENDPOINT;
    delete process.env.APPWRITE_PROJECT_ID;
    delete process.env.APPWRITE_DATABASE_ID;
    delete process.env.APPWRITE_API_KEY;
    delete process.env.REWARDS_SIGNING_SECRET;
    const r503 = await rewardsHandler({ req: { method: 'POST', headers: {}, body: '{}' }, res: makeRes(), error: noopErr });
    assert.equal(r503.status, 503);

    // Configure non-sensitive local dummy values (no network call is reached for 405/401/413/400)
    process.env.APPWRITE_ENDPOINT = 'https://example.invalid/v1';
    process.env.APPWRITE_PROJECT_ID = 'testproj';
    process.env.APPWRITE_DATABASE_ID = 'testdb';
    process.env.APPWRITE_API_KEY = 'dummy-key-for-unit-test';
    process.env.REWARDS_SIGNING_SECRET = 'dummy-secret-for-unit-test';

    // 2. Non-POST -> 405
    const r405 = await rewardsHandler({ req: { method: 'GET', headers: {}, body: '' }, res: makeRes(), error: noopErr });
    assert.equal(r405.status, 405);

    // 3. Missing auth headers -> 401
    const r401 = await rewardsHandler({ req: { method: 'POST', headers: {}, body: '{"action":"wallet"}' }, res: makeRes(), error: noopErr });
    assert.equal(r401.status, 401);

    // 4. Oversized payload -> 413
    const authHeaders = { 'x-appwrite-user-id': 'user1', 'x-appwrite-user-jwt': 'jwt.token.value' };
    const r413 = await rewardsHandler({
      req: { method: 'POST', headers: authHeaders, body: JSON.stringify({ pad: 'a'.repeat(20_000) }) },
      res: makeRes(),
      error: noopErr,
    });
    assert.equal(r413.status, 413);

    // 5. Malformed JSON -> 400
    const r400 = await rewardsHandler({
      req: { method: 'POST', headers: authHeaders, body: '{broken' },
      res: makeRes(),
      error: noopErr,
    });
    assert.equal(r400.status, 400);
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('formatAuthError prevents account enumeration, preserves ApiError messages, and strips internal errors', async () => {
  const { formatAuthError } = await import('../pages/auth');
  assert.equal(formatAuthError({ code: 401, type: 'user_invalid_credentials' }, 'login'), 'Invalid email or password.');
  assert.equal(formatAuthError({ code: 404, type: 'user_not_found' }, 'login'), 'Invalid email or password.');
  assert.equal(
    formatAuthError({ code: 409, type: 'user_already_exists' }, 'register'),
    'Unable to create an account with those details. Try logging in or resetting your password.',
  );
  assert.equal(formatAuthError(new ApiError('This service is temporarily unavailable.'), 'login'), 'This service is temporarily unavailable.');
  assert.match(formatAuthError({ code: 400 }, 'verify'), /invalid or expired/i);
  assert.match(formatAuthError({ code: 429 }, 'login'), /Too many attempts/i);
  const internal = formatAuthError(new Error('ECONNREFUSED 10.0.0.5:8080'), 'login');
  assert.equal(internal.includes('ECONNREFUSED'), false);
  assert.equal(internal.includes('10.0.0.5'), false);
});

test('SEO resolveAbsoluteUrl blocks unsafe schemes and protocol-relative paths', () => {
  const origin = 'https://www.forword.in';
  assert.equal(resolveAbsoluteUrl(origin, 'javascript:alert(1)'), `${origin}/og-image.jpg`);
  assert.equal(resolveAbsoluteUrl(origin, 'data:image/svg+xml,<svg onload=1>'), `${origin}/og-image.jpg`);
  assert.equal(resolveAbsoluteUrl(origin, '//evil.com/img.jpg'), `${origin}/og-image.jpg`);
  assert.equal(resolveAbsoluteUrl(origin, '/\\evil.com/img.jpg'), `${origin}/og-image.jpg`);
  assert.equal(resolveAbsoluteUrl(origin, 'https://cdn.forword.in/hero.jpg'), 'https://cdn.forword.in/hero.jpg');
});

test('SEO and public files use canonical www.forword.in with zero legacy vercel.app domain references', () => {
  const root = process.cwd();
  const seoFiles = ['index.html', 'public/robots.txt', 'public/sitemap.xml', 'src/lib/seo.ts'];
  for (const rel of seoFiles) {
    const content = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.equal(content.includes('finance-rj.vercel.app'), false, `${rel} must not contain legacy domain`);
    assert.equal(content.includes('https://www.forword.in'), true, `${rel} must reference canonical https://www.forword.in`);
  }
});

test('Appwrite setup UI, schema script, and hardcoded database identifiers are permanently removed', () => {
  const root = process.cwd();
  assert.equal(fs.existsSync(path.join(root, 'src/pages/appwrite.tsx')), false);
  assert.equal(fs.existsSync(path.join(root, 'src/lib/appwriteConfig.ts')), false);
  assert.equal(fs.existsSync(path.join(root, 'src/hooks/useAppwriteConfig.ts')), false);
  assert.equal(fs.existsSync(path.join(root, 'scripts/setup-appwrite.mjs')), false);

  const filesToCheck = ['src/App.tsx', 'src/lib/appwrite.ts', 'src/pages/profile.tsx', 'README.md', '.env.example', 'functions/rewards/src/main.js', 'functions/rewards/README.md'];
  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.equal(content.includes('newsfeed_main'), false, `${rel} should not contain hardcoded database ID`);
    assert.equal(content.includes('/settings/appwrite'), false, `${rel} should not reference /settings/appwrite`);
    assert.equal(content.includes('AppwriteSetupScreen'), false, `${rel} should not reference AppwriteSetupScreen`);
  }
});

test('isNotFoundError matches Appwrite 404 / document_not_found errors without swallowing other errors', () => {
  assert.equal(isNotFoundError({ code: 404, type: 'document_not_found', message: 'Document could not be found.' }), true);
  assert.equal(isNotFoundError({ code: 404 }), true);
  assert.equal(isNotFoundError({ type: 'document_not_found' }), true);
  assert.equal(isNotFoundError({ code: 401, type: 'user_unauthorized' }), false);
  assert.equal(isNotFoundError({ code: 500, type: 'general_unknown' }), false);
  assert.equal(isNotFoundError(null), false);
});

test('Prose headings and safeStorage helpers handle empty/non-browser environments safely', async () => {
  const { headings } = await import('../components/Prose');
  const { safeStorageGet, safeStorageSet, safeStorageRemove } = await import('./format');
  assert.deepEqual(headings(undefined as unknown as string), []);
  assert.deepEqual(headings('## Overview\nBody\n## Fees'), ['Overview', 'Fees']);
  assert.equal(safeStorageGet('local', 'missing-key'), null);
  assert.doesNotThrow(() => safeStorageSet('local', 'k', 'v'));
  assert.doesNotThrow(() => safeStorageRemove('local', 'k'));
});

test('formatApiError sanitizes raw backend errors across 401/403/404/409/429/500/timeout/network while preserving ApiError messages', () => {
  assert.equal(formatApiError(new ApiError('Insufficient wallet balance.')), 'Insufficient wallet balance.');
  assert.equal(formatApiError({ code: 401, type: 'user_unauthorized', message: 'internal jwt detail' }), 'Your session has expired. Please sign in again.');
  assert.equal(formatApiError({ code: 403 }), 'You do not have permission to perform this action.');
  assert.equal(formatApiError({ code: 404, type: 'document_not_found', message: 'Document secret_col_id not found' }), 'The requested item could not be found.');
  assert.equal(formatApiError({ code: 409, type: 'document_already_exists' }), 'This item already exists or was already submitted.');
  assert.equal(formatApiError({ code: 429 }), 'Too many requests. Please wait a moment and try again.');
  assert.match(formatApiError({ code: 500, message: 'SQLSTATE internal error' }), /temporarily unavailable/i);
  assert.equal(formatApiError(Object.assign(new Error('Aborted'), { name: 'AbortError' })), 'The request timed out. Please try again.');
  assert.equal(formatApiError(new Error('ETIMEDOUT socket hang up')), 'The request timed out. Please try again.');
  assert.equal(formatApiError(new Error('Failed to fetch')), 'Unable to connect right now. Check your internet connection and try again.');
  const raw = formatApiError(new Error('Collection with ID internal_users could not be found'));
  assert.equal(raw.includes('internal_users'), false);
});

test('Supabase table names in frontend client stay aligned with supabase/schema.sql and RLS policies', async () => {
  const { TABLES } = await import('./supabase');
  const root = process.cwd();
  const schemaSql = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
  for (const tableName of Object.values(TABLES)) {
    assert.equal(
      schemaSql.includes(`CREATE TABLE IF NOT EXISTS public.${tableName}`),
      true,
      `supabase/schema.sql must define table public.${tableName}`,
    );
    assert.equal(
      schemaSql.includes(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`),
      true,
      `supabase/schema.sql must enable RLS on public.${tableName}`,
    );
  }
});

test('runCached deduplicates concurrent in-flight requests and respects clearApiCache', async () => {
  clearApiCache();
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 15));
    return { value: calls };
  };
  const [a, b] = await Promise.all([
    runCached('dedup-key', 60_000, loader),
    runCached('dedup-key', 60_000, loader),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(a, { value: 1 });
  assert.deepEqual(b, { value: 1 });

  // Cached hit should not invoke loader again
  const c = await runCached('dedup-key', 60_000, loader);
  assert.equal(calls, 1);
  assert.deepEqual(c, { value: 1 });

  // Clearing cache forces fresh fetch
  clearApiCache();
  const d = await runCached('dedup-key', 60_000, loader);
  assert.equal(calls, 2);
  assert.deepEqual(d, { value: 2 });
  clearApiCache();
});
