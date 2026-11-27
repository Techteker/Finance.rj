# FORWORD

Indian financial news, product comparison, calculators, and offers built with React 18, Vite, TypeScript, and Tailwind CSS.

## Local Development
```bash
npm install
cp .env.example .env
npm run dev
```

## Build & Verify
```bash
npm run build
npm run lint
```

## Deployment (Vercel)
Configure the required environment variables in your hosting provider's dashboard (never commit `.env` or server secrets to source control):
- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `VITE_APPWRITE_DATABASE_ID`
- `VITE_APPWRITE_REWARDS_FUNCTION_ID` *(optional)*

Server-side function variables (`APPWRITE_API_KEY`, `REWARDS_SIGNING_SECRET`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`) must only be configured inside your server function runtime.
