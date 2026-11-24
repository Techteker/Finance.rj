# FORWORD.in

Indian financial news, product comparison, calculators and offers. React 18 + Vite + TypeScript + Tailwind, with Appwrite as the backend.
The design follows the FORWORD Figma file (5-tab mobile app: Home, Offers, Category, Favorite, Profile) using the olive-green palette.

## Quick start
```bash
npm install
cp .env.example .env     # fill in your Appwrite endpoint and project ID
npm run dev
npm run build            # production build into dist/
npm run typecheck        # optional strict type check
```
If the env variables are missing, the app shows a "Backend not configured" screen. It never falls back to demo data.

## Backend (Appwrite, database `newsfeed_main`)
Reuse your existing project and database. To create any missing collections/attributes/indexes (nothing is deleted):
```bash
APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... npm run setup:appwrite
```
Run it on your machine only. Never put the API key in frontend code or `.env` files that are deployed.

Collections used by the app: `news, categories, brands, offers, products, product_reviews, product_comparisons, favorites, notifications, reading_history, calculators_history, users, reports, contact_messages, reward_events, withdrawals, referrals`.
No Admin Panel, admin roles, RSS ingestion, RSS source/log collections, or admin-only editorial staging collection is part of this application. Existing legacy collections are left untouched; this setup script does not delete data.
If your existing schema uses different attribute names, change them in one place: `src/types.ts` and `src/lib/api.ts`.

### Important: approved-only content and ownership
The `news`, `products`, and `offers` collections use document-level security. Keep collection-level public read disabled. Grant `read(any)` on an individual content document only after it is approved and published; draft, pending, and rejected documents must have no public read permission. The public app also filters for `status = "approved"`, but the document permission is the actual security boundary. Private collections (`users`, `favorites`, `reading_history`, `calculators_history`, `reward_events`, `withdrawals`, and `referrals`) must remain document-secured and must never grant collection-wide public read. Notifications use document-level permissions: public notifications may grant `read(any)`; user-specific notifications must grant read only to their owner.

### Data conventions
- News, products and offers store denormalised names/logos (`categoryName`, `bankName`, `brandName`, ...) so lists load without extra API calls.
- `products.facts` is a string array of `"Label|Value"` pairs (e.g. `"Annual fee|₹0"`). They appear on cards and in the comparison table. Nothing is invented: empty values show "Not available".
- `products.category` = category slug (`credit-cards`), `subcategory` = sub slug (`best-credit-cards`). Slugs are in `src/lib/menu.ts`.
- `editorialRank` controls "Recommended" ordering. Keep it independent of commercial deals.
- Article `body` supports `## Heading`, `### Heading`, `- list`, `**bold**` and paragraphs.
- Full-text search needs the `fulltext` indexes created by the setup script.

### Rewards
Coins and wallet balances change only inside the Appwrite Function source at `functions/forword-rewards/src/main.js`. The client forwards a short-lived JWT created from the signed-in Appwrite session; the function verifies it with `Account.get()` and derives the user ID from that verified account. The function uses the runtime `APPWRITE_FUNCTION_API_KEY`, transaction-backed ledger writes, deterministic reward event IDs, and a minimum withdrawal floor of ₹500. Referral attribution is recorded once per new account; both the referrer and referred user receive 1000 coins only after the new account verifies its email or phone. Configure `REWARDS_SIGNING_SECRET` and the owner-approved `COIN_RUPEES` value as Appwrite Function variables before enabling credit or withdrawal actions. There is intentionally no default INR conversion rate: reward credits and withdrawals return a configuration error until `COIN_RUPEES` is explicitly set. Set `VITE_APPWRITE_REWARDS_FUNCTION_ID=forword-rewards` in Vercel.

## Routes
`/` home, `/news/:slug`, `/news/category/:slug`, `/feed/:kind`, `/category`, `/category/:slug`, `/credit-cards/best-credit-cards` (any `/:category/:subcategory` from `src/lib/menu.ts`), `/product/:slug`, `/compare?ids=a,b`, `/go/:slug`, `/offers`, `/offers/:id`, `/brands/:id`, `/favorites`, `/profile`, `/settings/*`, `/rewards`, `/wallet`, `/calculators/:slug`, `/search`, plus auth, legal and utility pages.

## Before you go live
- Verify `src/lib/taxConfig.ts` slabs against the Income Tax Department for each year you offer.
- Replace the draft Terms and Privacy text in `src/pages/utility.tsx`.
- SEO: this is a client-rendered SPA. For indexable news/product pages add prerendering or SSR (e.g. Vite SSR, Prerender, or move to Next.js), plus sitemap.xml and robots.txt.
- Add SPA fallback on your host (all paths serve `index.html`).
- No Admin Panel or RSS system is included. Content publishing is performed through trusted backend/database operations outside this public user app.
