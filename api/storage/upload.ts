import multer from 'multer';
import type { Request, Response } from 'express';
import { uploadStorageRouteHandler } from '../../server/storageService';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const config = { api: { bodyParser: false } };

export default async function handler(req: Request, res: Response) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

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

  return uploadStorageRouteHandler(req, res);
}
