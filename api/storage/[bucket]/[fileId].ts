import type { Request, Response } from 'express';
import * as storageModule from '../../../server/storageService.ts';
const deleteStorageRouteHandler =
  (storageModule as any).deleteStorageRouteHandler ??
  (storageModule as any).default?.deleteStorageRouteHandler;
function adaptResponse(res: Response): Response {
  const native = res as any;
  if (typeof native.status !== 'function') native.status = (code: number) => { native.statusCode = code; return res; };
  if (typeof native.json !== 'function') native.json = (body: unknown) => {
    if (!native.headersSent) native.setHeader('Content-Type', 'application/json; charset=utf-8');
    native.end(JSON.stringify(body)); return res;
  };
  return res;
}
export default async function handler(req: Request, res: Response) {
  res = adaptResponse(res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'DELETE') { res.setHeader('Allow', 'DELETE'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (typeof deleteStorageRouteHandler !== 'function') return res.status(500).json({ error: 'Storage service unavailable.' });
  (req as Request & { params: Record<string, string> }).params = (req as Request & { params?: Record<string, string> }).params ?? {};
  req.params.bucket = String(req.query.bucket || '');
  req.params.fileId = String(req.query.fileId || '');
  return deleteStorageRouteHandler(req, res);
}
