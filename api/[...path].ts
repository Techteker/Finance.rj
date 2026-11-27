import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { getServerSupabaseConfig } from '../server/supabaseAdmin.ts';
import { rewardsRouteHandler } from '../server/rewardsService.ts';
import {
  deleteStorageRouteHandler,
  getAppwriteStorageConfig,
  replaceStorageRouteHandler,
  uploadStorageRouteHandler,
} from '../server/storageService.ts';

// Vercel must pass the raw multipart stream to multer; JSON parsing is handled by Express.
export const config = {
  api: {
    bodyParser: false,
  },
};

const app = express();
app.disable('x-powered-by');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use('/api', express.json({ limit: '32kb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  const supabase = getServerSupabaseConfig();
  const appwrite = getAppwriteStorageConfig();
  res.status(200).json({
    ok: true,
    supabase: supabase.configured,
    appwriteStorage: appwrite.configured,
  });
});

app.post('/api/rewards', rewardsRouteHandler);
app.post('/api/storage/upload', upload.single('file'), uploadStorageRouteHandler);
app.put('/api/storage/replace/:fileId', upload.single('file'), replaceStorageRouteHandler);
app.delete('/api/storage/:bucket/:fileId', deleteStorageRouteHandler);

app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size exceeds the maximum allowed limit.' });
    }
    return res.status(400).json({ error: 'Invalid file upload payload.' });
  }

  const syntaxErr = err as { type?: string };
  if (syntaxErr?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON payload.' });
  }

  console.error('[FORWORD api] unhandled error:', err instanceof Error ? err.message : String(err));
  return res.status(500).json({ error: 'Internal server error.' });
});

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

export default app;
