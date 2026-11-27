import multer from 'multer';
import type { Request, Response } from 'express';
import { adaptExpressResponse } from '../../../server/vercelResponse';
import { replaceStorageRouteHandler } from '../../../server/storageService';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const config = { api: { bodyParser: false } };

export default async function handler(req: Request, res: Response) {
  res = adaptExpressResponse(res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  (req as Request & { params: Record<string, string> }).params = (req as Request & { params?: Record<string, string> }).params ?? {};
  req.params.fileId = String(req.query.fileId || '');
  try {
    await new Promise<void>((resolve, reject) => {
      upload.single('file')(req, res, (error) => error ? reject(error) : resolve());
    });
  } catch (error) {
    const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? 'File size exceeds the maximum allowed limit.' : 'Invalid file upload payload.',
    });
  }

  return replaceStorageRouteHandler(req, res);
}
