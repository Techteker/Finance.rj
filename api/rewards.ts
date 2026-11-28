import type { Request, Response } from 'express';
import * as rewardsModule from '../server/rewardsService';

const rewardsRouteHandler =
  (rewardsModule as any).rewardsRouteHandler ??
  (rewardsModule as any).default?.rewardsRouteHandler;

function adaptResponse(res: Response): Response {
  const native = res as any;
  if (typeof native.status !== 'function') native.status = (code: number) => { native.statusCode = code; return res; };
  if (typeof native.json !== 'function') native.json = (body: unknown) => {
    if (!native.headersSent) native.setHeader('Content-Type', 'application/json; charset=utf-8');
    native.end(JSON.stringify(body));
    return res;
  };
  return res;
}

/** Vercel Node.js function adapter. Authorization and reward mutations stay server-side. */
export default async function handler(req: Request, res: Response) {
  res = adaptResponse(res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (typeof rewardsRouteHandler !== 'function') {
    console.error('[FORWORD rewards] shared route handler export unavailable');
    return res.status(500).json({ error: 'Rewards service unavailable.' });
  }
  return rewardsRouteHandler(req, res);
}
