import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const body = {
    ok: true,
    services: {
      appwriteStorage: Boolean(
        process.env.APPWRITE_ENDPOINT &&
        process.env.APPWRITE_PROJECT_ID &&
        process.env.APPWRITE_API_KEY
      ),
      supabaseAdmin: Boolean(
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    },
  };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
