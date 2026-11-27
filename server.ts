import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { getServerSupabaseConfig } from './server/supabaseAdmin.ts';
import { rewardsRouteHandler } from './server/rewardsService.ts';
import {
  deleteStorageRouteHandler,
  getAppwriteStorageConfig,
  replaceStorageRouteHandler,
  uploadStorageRouteHandler,
} from './server/storageService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB upper bound (image buckets further restricted to 5 MB)
    files: 1,
  },
});

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use('/api', express.json({ limit: '32kb' }));

  // Health & integration readiness probe (never returns secrets)
  app.get('/api/health', (_req: Request, res: Response) => {
    const sb = getServerSupabaseConfig();
    const aw = getAppwriteStorageConfig();
    res.status(200).json({
      ok: true,
      supabase: sb.configured,
      appwriteStorage: aw.configured,
    });
  });

  // Server-verified Rewards & Wallet API (Supabase Auth JWT + service_role ledger)
  app.post('/api/rewards', rewardsRouteHandler);

  // Appwrite File Storage API (authenticated upload, replace, delete; API key stays server-only)
  app.post('/api/storage/upload', upload.single('file'), uploadStorageRouteHandler);
  app.put('/api/storage/replace/:fileId', upload.single('file'), replaceStorageRouteHandler);
  app.delete('/api/storage/:bucket/:fileId', deleteStorageRouteHandler);

  // API error handler (multer limits, malformed JSON, etc.)
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

  // Return 404 JSON for unmatched /api routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET') return next();
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FORWORD] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[FORWORD] Failed to start server:', err);
  process.exit(1);
});
