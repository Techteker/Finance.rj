# FORWORD Rewards Appwrite Function & Backend Specification

Runtime: **Node.js 22** (`node-22.0`).  
Entrypoint: `src/main.js`.  
Build command: `npm install`.  
Execute permissions: `Role.users()` (authenticated Appwrite users only; never `Role.any()`).

## Required Function Environment Variables (server-side only)
- `APPWRITE_ENDPOINT` — Appwrite Cloud / self-hosted endpoint (`https://<region>.cloud.appwrite.io/v1`)
- `APPWRITE_PROJECT_ID` — FORWORD Appwrite project ID
- `APPWRITE_DATABASE_ID` — FORWORD Appwrite database ID
- `APPWRITE_API_KEY` — Server API key scoped strictly to `users.read`, `databases.read`, `documents.read`, `documents.write`
- `REWARDS_SIGNING_SECRET` — Long random HMAC secret (minimum 32 characters)

## Optional Function Environment Variables
- `CHECKIN_COINS=5`
- `READ_COINS=1`
- `REFERRAL_COINS=25`
- `READ_SECONDS=20`
- `MAX_DAILY_READS=20`
- `MAX_REFERRALS_PER_USER=50`
- `MAX_PENDING_WITHDRAWALS=3`
- `COIN_RUPEES=0.01`
- `MIN_WITHDRAWAL=100`
- `MAX_WITHDRAWAL=100000`

The function verifies the caller's Appwrite user JWT (`x-appwrite-user-jwt` matches `x-appwrite-user-id`) before using its server API key. It owns all balance, reward ledger, referral, and withdrawal mutations. Never expose `APPWRITE_API_KEY` or `REWARDS_SIGNING_SECRET` in `VITE_*` variables.

## Supported Actions
- `wallet` — Returns or initializes caller wallet (`coins`, `balance`, `streak`, `lastCheckIn`, `referralCode`).
- `events` — Lists caller's recent `reward_events` (`userId === caller`).
- `withdrawals` — Lists caller's recent `withdrawals` (`userId === caller`).
- `check-in` — Daily check-in with streak calculation and deterministic per-day event ID.
- `start-read` / `read` — HMAC-signed reading session enforcing approved article check, minimum `READ_SECONDS`, 30-minute expiry, per-article deduplication, and `MAX_DAILY_READS`.
- `apply-referral` — Server-validated referral redemption blocking self-referral, unknown/malformed codes, referrer cap (`MAX_REFERRALS_PER_USER`), and duplicate claims.
- `withdraw` — Server-validated UPI withdrawal request (`status: 'pending'` only; enforces min/max bounds, UPI regex, balance, idempotent `requestId`, pending cap, and atomic rollback on deduction failure). This function never disburses funds automatically; a trusted operator must review and settle payouts.

## Appwrite Collection Schema, Indexes & Permission Matrix (14 Collections)

> Note: Wallet fields (`coins`, `balance`, `streak`, `lastCheckIn`, `referralCode`) are stored on the server-private `users` collection. There is no separate `wallets` collection in the codebase.

### 1. Public Catalog Collections (`Read: Role.any()`, `Create/Update/Delete: none / admin-only`)
- `news` — Indexes: unique `slug`, key `(status, publishedAt)`, key `(status, categorySlug, publishedAt)`, key `(status, views)`, fulltext `title`.
- `categories` — Indexes: key `(kind, sortOrder)`, key `isTrending`.
- `brands` — Indexes: key `status`.
- `offers` — Indexes: key `(status, $createdAt)`, key `(status, brandId)`, key `(status, category)`, fulltext `title`.
- `products` — Indexes: unique `slug`, key `(status, category, editorialRank)`, key `(status, category, subcategory, editorialRank)`, fulltext `name`.

### 2. User-Scoped Collections (`Document Security: ON`, Collection `Create: Role.users()`, Document `Read/Update/Delete: Role.user(userId)`)
- `favorites` — Index: key `(userId, $createdAt)`.
- `reading_history` — Index: key `(userId, $createdAt)`.
- `calculators_history` — Index: key `(userId, $createdAt)`.

### 3. Notifications Collection (`Document Security: ON`, Collection `Create/Update/Delete: admin/server only`)
- `notifications` — Global broadcasts (`userId` null) have document `Read: Role.any()`; personal notifications have document `Read: Role.user(userId)`. Index: key `(userId, $createdAt)`.

### 4. Write-Only Intake Collections (`Create: Role.any()` or `Role.users()` for reports; `Read/Update/Delete: admin/server only`)
- `reports` — Article moderation reports (`newsId`, `reason`, `userId`).
- `contact_messages` — Contact form submissions (`name`, `email`, `message`).

### 5. Sensitive Financial Collections (`Collection & Document Permissions: CLOSED to all clients`, server API key only)
- `users` — Document ID equals Appwrite Auth `userId`. Attributes: `name`, `email`, `coins`, `balance`, `streak`, `lastCheckIn`, `referralCode`. **Required unique index:** `referralCode`.
- `reward_events` — Deterministic document ID (`sha256` hash). Attributes: `userId`, `kind`, `label`, `coins`. Indexes: key `(userId, $createdAt)`, key `(userId, kind, $createdAt)`.
- `withdrawals` — Deterministic document ID (`sha256` hash). Attributes: `userId`, `amount`, `upiId`, `status`. Indexes: key `(userId, $createdAt)`, key `(userId, status)`.

## Staging Deployment & Email/Domain Checklist
1. **Appwrite Platforms**: Add web platforms for `www.forword.in`, `forword.in`, and your staging hostname so verification/recovery redirects (`/verify-email`, `/reset-password`) are authorized.
2. **SMTP & Email Templates**: Configure a verified custom SMTP provider (SPF/DKIM/DMARC on `forword.in`) in Appwrite Project Settings → SMTP so verification and password recovery emails deliver reliably.
3. **Deploy Function**:
   - In Appwrite Console → Functions, select the existing FORWORD rewards function (or create one if none exists) with runtime **Node.js 22**, entrypoint `src/main.js`, build command `npm install`, timeout `15s`, and Execute permission `Role.users()`.
   - Configure all required server-side environment variables above (never copy `APPWRITE_API_KEY` or `REWARDS_SIGNING_SECRET` to frontend `VITE_*` variables).
   - Deploy the `functions/rewards` directory via Appwrite CLI (`appwrite push functions`) or Git/tarball deployment, then set `VITE_APPWRITE_REWARDS_FUNCTION_ID` in the frontend environment to the deployed function ID.
