import type { Request, Response } from 'express';
import { adaptExpressResponse } from '../../../server/vercelResponse.ts';
import { deleteStorageRouteHandler } from '../../../server/storageService.ts';

export default async function handler(req: Request, res: Response) {
  res = adaptExpressResponse(res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  (req as Request & { params: Record<string, string> }).params = (req as Request & { params?: Record<string, string> }).params ?? {};
  req.params.bucket = String(req.query.bucket || '');
  req.params.fileId = String(req.query.fileId || '');
  return deleteStorageRouteHandler(req, res);
}
