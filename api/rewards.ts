import type { Request, Response } from 'express';
import * as responseModule from '../server/vercelResponse.ts';
import * as rewardsModule from '../server/rewardsService.ts';
const adaptExpressResponse = (responseModule as any).adaptExpressResponse ?? (responseModule as any).default?.adaptExpressResponse;
const rewardsRouteHandler = (rewardsModule as any).rewardsRouteHandler ?? (rewardsModule as any).default?.rewardsRouteHandler;

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
