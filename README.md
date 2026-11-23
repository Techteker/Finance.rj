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

Collections used by the app: `news, categories, brands, offers, products, product_reviews, product_comparisons, favorites, notifications, reading_history, calculators_history, users, admin_users`.
Added because features need them: `news_pending` (admin-only staging), `reports`, `contact_messages`, `reward_events`, `withdrawals`.
If your existing schema uses different attribute names, change them in one place: `src/types.ts` and `src/lib/api.ts`.

### Important: approved-only content
Appwrite collection permissions cannot filter by field value. The app queries `status = "approved"`, but anyone calling the API directly could read unapproved documents in a public-read collection. To make "approved only" real, keep pending/rejected editorial items in `news_pending` (admin-only) and create the public `news` document only after approval.

### Data conventions
- News, products and offers store denormalised names/logos (`categoryName`, `bankName`, `brandName`, ...) so lists load without extra API calls.
- `products.facts` is a string array of `"Label|Value"` pairs (e.g. `"Annual fee|₹0"`). They appear on cards and in the comparison table. Nothing is invented: empty values show "Not available".
- `products.category` = category slug (`credit-cards`), `subcategory` = sub slug (`best-credit-cards`). Slugs are in `src/lib/menu.ts`.
- `editorialRank` controls "Recommended" ordering. Keep it independent of commercial deals.
- Article `body` supports `## Heading`, `### Heading`, `- list`, `**bold**` and paragraphs.
- Full-text search needs the `fulltext` indexes created by the setup script.

### Rewards
Coins and wallet balances must only change on the server. The app calls an Appwrite Function (set `VITE_APPWRITE_REWARDS_FUNCTION_ID`) with JSON `{action: "check-in" | "read" | "withdraw", ...}` and expects JSON back (or `{error}` with status >= 400). The function is not included; implement it with a server API key. Wallet data is read from the `users` document whose ID equals the Appwrite user ID.

## Routes
`/` home, `/news/:slug`, `/news/category/:slug`, `/feed/:kind`, `/category`, `/category/:slug`, `/credit-cards/best-credit-cards` (any `/:category/:subcategory` from `src/lib/menu.ts`), `/product/:slug`, `/compare?ids=a,b`, `/go/:slug`, `/offers`, `/offers/:id`, `/brands/:id`, `/favorites`, `/profile`, `/settings/*`, `/rewards`, `/wallet`, `/calculators/:slug`, `/search`, plus auth, legal and utility pages.

## Before you go live
- Verify `src/lib/taxConfig.ts` slabs against the Income Tax Department for each year you offer.
- Replace the draft Terms and Privacy text in `src/pages/utility.tsx`.
- SEO: this is a client-rendered SPA. For indexable news/product pages add prerendering or SSR (e.g. Vite SSR, Prerender, or move to Next.js), plus sitemap.xml and robots.txt.
- Add SPA fallback on your host (all paths serve `index.html`).
- Admin panel is a separate app and is not included.
