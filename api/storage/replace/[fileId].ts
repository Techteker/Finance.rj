import multer from 'multer';
import type { Request, Response } from 'express';
import * as storageModule from '../../../server/storageService.ts';
const replaceStorageRouteHandler =
  (storageModule as any).replaceStorageRouteHandler ??
  (storageModule as any).default?.replaceStorageRouteHandler;
function adaptResponse(res: Response): Response {
  const native = res as any;
  if (typeof native.status !== 'function') native.status = (code: number) => { native.statusCode = code; return res; };
  if (typeof native.json !== 'function') native.json = (body: unknown) => {
    if (!native.headersSent) native.setHeader('Content-Type', 'application/json; charset=utf-8');
    native.end(JSON.stringify(body)); return res;
  };
  return res;
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
export const config = { api: { bodyParser: false } };
export default async function handler(req: Request, res: Response) {
  res = adaptResponse(res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'PUT') { res.setHeader('Allow', 'PUT'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (typeof replaceStorageRouteHandler !== 'function') return res.status(500).json({ error: 'Storage service unavailable.' });
  (req as Request & { params: Record<string, string> }).params = (req as Request & { params?: Record<string, string> }).params ?? {};
  req.params.fileId = String(req.query.fileId || '');
  try {
    await new Promise<void>((resolve, reject) => {
      upload.single('file')(req, res, (error) => error ? reject(error) : resolve());
    });
  } catch (error) {
    const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'File size exceeds the maximum allowed limit.' : 'Invalid file upload payload.' });
  }
  return replaceStorageRouteHandler(req, res);
}
