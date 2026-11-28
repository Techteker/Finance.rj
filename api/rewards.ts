import type { Request, Response } from 'express';
import { adaptExpressResponse } from '../server/vercelResponse.js';
import { rewardsRouteHandler } from '../server/rewardsService.js';

/**
 * Vercel Node.js function adapter. All authorization, reward validation,
 * idempotency and ledger mutations remain in the shared server handler.
 */
export default async function handler(req: Request, res: Response) {
  res = adaptExpressResponse(res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return rewardsRouteHandler(req, res);
}
