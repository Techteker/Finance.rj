import type { Request, Response } from 'express';
import { deleteStorageRouteHandler } from '../../../server/storageService.ts';

export default async function handler(req: Request, res: Response) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  req.params.bucket = String(req.query.bucket || '');
  req.params.fileId = String(req.query.fileId || '');
  return deleteStorageRouteHandler(req, res);
}
