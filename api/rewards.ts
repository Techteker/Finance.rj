import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rewardsRouteHandler } from '../server/rewardsService.ts';

/**
 * Vercel Node.js function adapter for the existing server-verified rewards
 * handler. Authentication, validation, idempotency and ledger writes remain
 * centralized in server/rewardsService.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Vercel supplies a parsed JSON body for application/json requests.
  return rewardsRouteHandler(
    req as unknown as Parameters<typeof rewardsRouteHandler>[0],
    res as unknown as Parameters<typeof rewardsRouteHandler>[1],
  );
}
