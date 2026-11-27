import type { Request, Response } from 'express';
import { adaptExpressResponse } from '../server/vercelResponse';

export default function handler(_req: Request, res: Response) {
  res = adaptExpressResponse(res);
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
  return res.status(200).json(body);
}
