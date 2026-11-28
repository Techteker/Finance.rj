import path from 'node:path';
import type { Request, Response } from 'express';
import { Client, ID, Permission, Role, Storage } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import * as supabaseAdminModule from './supabaseAdmin';
const supabaseAdminModuleValue = (supabaseAdminModule as any).default ?? supabaseAdminModule;
const { getSupabaseAdmin, verifySupabaseSession } = supabaseAdminModuleValue as typeof import('./supabaseAdmin');
type VerifiedSession = import('./supabaseAdmin').VerifiedSession;

export const ALLOWED_BUCKETS = [
  'profile-images',
  'news-images',
  'brand-logos',
  'offer-banners',
  'product-images',
  'documents',
] as const;

export type LogicalBucket = (typeof ALLOWED_BUCKETS)[number];

const ADMIN_ONLY_BUCKETS = new Set<LogicalBucket>([
  'news-images',
  'brand-logos',
  'offer-banners',
  'product-images',
]);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DOCUMENT_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB for editorial images
const MAX_PROFILE_IMAGE_BYTES = 200 * 1024; // strict profile-photo limit
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const SAFE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export function isLogicalBucket(value: string): value is LogicalBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

export function getAppwriteStorageConfig() {
  const endpoint = (process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || '').trim().replace(/\/+$/, '');
  const projectId = (process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || '').trim();
  const apiKey = (process.env.APPWRITE_API_KEY || '').trim();
  const defaultBucketId = (process.env.VITE_APPWRITE_BUCKET_ID || '').trim();
  return {
    endpoint,
    projectId,
    apiKey,
    defaultBucketId,
    configured: Boolean(endpoint && projectId && apiKey),
  };
}

export function resolveServerBucketId(bucket: LogicalBucket): string {
  const envMap: Record<LogicalBucket, string | undefined> = {
    'profile-images': process.env.VITE_APPWRITE_BUCKET_PROFILE_IMAGES || 'forword-media',
    'news-images': process.env.VITE_APPWRITE_BUCKET_NEWS_IMAGES,
    'brand-logos': process.env.VITE_APPWRITE_BUCKET_BRAND_LOGOS,
    'offer-banners': process.env.VITE_APPWRITE_BUCKET_OFFER_BANNERS,
    'product-images': process.env.VITE_APPWRITE_BUCKET_PRODUCT_IMAGES,
    documents: process.env.VITE_APPWRITE_BUCKET_DOCUMENTS,
  };
  return (envMap[bucket] || bucket || process.env.VITE_APPWRITE_BUCKET_ID || '').trim();
}

/** Verifies file header magic bytes match the declared MIME type to block spoofed HTML/SVG/script uploads. */
export function sniffFileMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  // GIF: GIF87a / GIF89a
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii').startsWith('GIF8')) {
    return 'image/gif';
  }
  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  // PDF: %PDF-
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

export function sanitizeUploadFilename(originalName: string, mimeType: string): string {
  const extByMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
  };
  const base = path.basename(String(originalName || 'upload')).replace(/\.[^.]+$/, '');
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'file';
  return `${clean}${extByMime[mimeType] || ''}`;
}

export function validateServerUpload(
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined,
  bucket: LogicalBucket,
): { ok: true; mimeType: string; fileName: string } | { ok: false; status: number; error: string } {
  if (!file || !Buffer.isBuffer(file.buffer) || file.size <= 0) {
    return { ok: false, status: 400, error: 'A valid file is required.' };
  }
  const isDoc = bucket === 'documents';
  const isProfile = bucket === 'profile-images';
  const maxBytes = isDoc ? MAX_DOCUMENT_BYTES : isProfile ? MAX_PROFILE_IMAGE_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes || file.buffer.length > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: isProfile ? 'Profile photos must be 200 KB or smaller.' : `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB upload limit.`,
    };
  }
  const declared = String(file.mimetype || '').toLowerCase().trim();
  const allowed = isDoc ? DOCUMENT_MIME_TYPES : isProfile ? new Set(['image/jpeg']) : IMAGE_MIME_TYPES;
  if (!allowed.has(declared)) {
    return {
      ok: false,
      status: 400,
      error: isDoc
        ? 'Only PDF, JPEG, PNG, WebP, or GIF files are permitted.'
        : 'Only JPEG, PNG, WebP, or GIF images are permitted.',
    };
  }
  const detected = sniffFileMagicBytes(file.buffer);
  if (!detected || !allowed.has(detected)) {
    return {
      ok: false,
      status: 400,
      error: 'File content does not match an allowed image or document format.',
    };
  }
  return {
    ok: true,
    mimeType: detected,
    fileName: sanitizeUploadFilename(file.originalname, detected),
  };
}

export function canWriteToBucket(session: VerifiedSession, bucket: LogicalBucket): boolean {
  if (ADMIN_ONLY_BUCKETS.has(bucket)) {
    return session.role === 'admin';
  }
  return Boolean(session.userId);
}

export function canManageFile(
  session: VerifiedSession,
  fileRecord: { owner_id?: string | null; bucket_id?: string } | null,
  bucket: LogicalBucket,
): boolean {
  if (session.role === 'admin') return true;
  if (ADMIN_ONLY_BUCKETS.has(bucket)) return false;
  return Boolean(fileRecord?.owner_id && fileRecord.owner_id === session.userId);
}

export function buildAppwritePreviewUrl(
  endpoint: string,
  projectId: string,
  bucketId: string,
  fileId: string,
  bucket: LogicalBucket,
): string {
  const base = endpoint.replace(/\/+$/, '');
  const mode = bucket === 'documents' ? 'view' : 'preview';
  return `${base}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/${mode}?project=${encodeURIComponent(projectId)}`;
}

function createServerAppwriteStorage() {
  const cfg = getAppwriteStorageConfig();
  if (!cfg.configured) return null;
  const client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId).setKey(cfg.apiKey);
  return { storage: new Storage(client), cfg };
}

export async function uploadStorageRouteHandler(req: Request, res: Response) {
  try {
    const auth = await verifySupabaseSession(req.headers.authorization);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const appwrite = createServerAppwriteStorage();
    const supabaseAdmin = getSupabaseAdmin();
    if (!appwrite || !supabaseAdmin) {
      return res.status(503).json({ error: 'File storage service is not configured.' });
    }

    const rawBucket = String(req.body?.bucket || '').trim();
    if (!isLogicalBucket(rawBucket)) {
      return res.status(400).json({ error: 'Invalid storage bucket.' });
    }
    if (!canWriteToBucket(auth.session, rawBucket)) {
      return res.status(403).json({ error: 'Only administrators can upload to this bucket.' });
    }

    const uploadedFile = (req as Request & { file?: Express.Multer.File }).file;
    const validation = validateServerUpload(uploadedFile, rawBucket);
    if (!validation.ok) {
      return res.status(validation.status).json({ error: validation.error });
    }

    const bucketId = resolveServerBucketId(rawBucket);
    const fileId = ID.unique();
    const permissions = rawBucket === 'documents' ? [] : [Permission.read(Role.any())];

    await appwrite.storage.createFile(
      bucketId,
      fileId,
      InputFile.fromBuffer(uploadedFile!.buffer, validation.fileName),
      permissions,
    );

    const previewUrl = buildAppwritePreviewUrl(
      appwrite.cfg.endpoint,
      appwrite.cfg.projectId,
      bucketId,
      fileId,
      rawBucket,
    );

    const entityType = typeof req.body?.entityType === 'string' ? req.body.entityType.trim().slice(0, 64) : null;
    const entityId = typeof req.body?.entityId === 'string' ? req.body.entityId.trim().slice(0, 64) : null;

    const { error: metaErr } = await supabaseAdmin.from('storage_files').insert({
      bucket_id: rawBucket,
      file_id: fileId,
      owner_id: auth.session.userId,
      entity_type: entityType,
      entity_id: entityId,
      mime_type: validation.mimeType,
      size_bytes: uploadedFile!.size,
      file_name: validation.fileName,
      preview_url: previewUrl,
    });

    if (metaErr) {
      // Roll back Appwrite object if metadata persistence fails
      await appwrite.storage.deleteFile(bucketId, fileId).catch(() => {});
      throw metaErr;
    }

    if (rawBucket === 'profile-images') {
      await supabaseAdmin
        .from('profiles')
        .update({
          avatar_url: previewUrl,
          avatar_file_id: fileId,
          avatar_bucket_id: bucketId,
        })
        .eq('id', auth.session.userId);
    }

    return res.status(201).json({
      fileId,
      bucketId: rawBucket,
      previewUrl,
      mimeType: validation.mimeType,
      sizeBytes: uploadedFile!.size,
      fileName: validation.fileName,
    });
  } catch (err) {
    console.error('[FORWORD storage] upload error:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Could not upload file. Please try again.' });
  }
}

export async function replaceStorageRouteHandler(req: Request, res: Response) {
  try {
    const auth = await verifySupabaseSession(req.headers.authorization);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const appwrite = createServerAppwriteStorage();
    const supabaseAdmin = getSupabaseAdmin();
    if (!appwrite || !supabaseAdmin) {
      return res.status(503).json({ error: 'File storage service is not configured.' });
    }

    const previousFileId = String(req.params.fileId || '').trim();
    const rawBucket = String(req.body?.bucket || '').trim();
    if (!SAFE_ID_RE.test(previousFileId) || !isLogicalBucket(rawBucket)) {
      return res.status(400).json({ error: 'Invalid file reference or storage bucket.' });
    }

    const { data: existing } = await supabaseAdmin
      .from('storage_files')
      .select('owner_id, bucket_id')
      .eq('file_id', previousFileId)
      .maybeSingle();

    if (!canManageFile(auth.session, existing, rawBucket)) {
      return res.status(403).json({ error: 'You do not have permission to replace this file.' });
    }

    const uploadedFile = (req as Request & { file?: Express.Multer.File }).file;
    const validation = validateServerUpload(uploadedFile, rawBucket);
    if (!validation.ok) {
      return res.status(validation.status).json({ error: validation.error });
    }

    const bucketId = resolveServerBucketId(rawBucket);
    const newFileId = ID.unique();
    const permissions = rawBucket === 'documents' ? [] : [Permission.read(Role.any())];

    await appwrite.storage.createFile(
      bucketId,
      newFileId,
      InputFile.fromBuffer(uploadedFile!.buffer, validation.fileName),
      permissions,
    );

    const previewUrl = buildAppwritePreviewUrl(
      appwrite.cfg.endpoint,
      appwrite.cfg.projectId,
      bucketId,
      newFileId,
      rawBucket,
    );

    const { error: metaErr } = await supabaseAdmin.from('storage_files').insert({
      bucket_id: rawBucket,
      file_id: newFileId,
      owner_id: auth.session.userId,
      entity_type: typeof req.body?.entityType === 'string' ? req.body.entityType.trim().slice(0, 64) : null,
      entity_id: typeof req.body?.entityId === 'string' ? req.body.entityId.trim().slice(0, 64) : null,
      mime_type: validation.mimeType,
      size_bytes: uploadedFile!.size,
      file_name: validation.fileName,
      preview_url: previewUrl,
    });

    if (metaErr) {
      await appwrite.storage.deleteFile(bucketId, newFileId).catch(() => {});
      throw metaErr;
    }

    if (rawBucket === 'profile-images') {
      await supabaseAdmin
        .from('profiles')
        .update({
          avatar_url: previewUrl,
          avatar_file_id: newFileId,
          avatar_bucket_id: bucketId,
        })
        .eq('id', auth.session.userId);
    }

    // Delete old file after replacement succeeds
    await appwrite.storage.deleteFile(bucketId, previousFileId).catch(() => {});
    await supabaseAdmin.from('storage_files').delete().eq('file_id', previousFileId);

    return res.status(200).json({
      fileId: newFileId,
      bucketId: rawBucket,
      previewUrl,
      mimeType: validation.mimeType,
      sizeBytes: uploadedFile!.size,
      fileName: validation.fileName,
    });
  } catch (err) {
    console.error('[FORWORD storage] replace error:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Could not replace file. Please try again.' });
  }
}

export async function deleteStorageRouteHandler(req: Request, res: Response) {
  try {
    const auth = await verifySupabaseSession(req.headers.authorization);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const appwrite = createServerAppwriteStorage();
    const supabaseAdmin = getSupabaseAdmin();
    if (!appwrite || !supabaseAdmin) {
      return res.status(503).json({ error: 'File storage service is not configured.' });
    }

    const rawBucket = String(req.params.bucket || '').trim();
    const fileId = String(req.params.fileId || '').trim();
    if (!isLogicalBucket(rawBucket) || !SAFE_ID_RE.test(fileId)) {
      return res.status(400).json({ error: 'Invalid file reference.' });
    }

    const { data: existing } = await supabaseAdmin
      .from('storage_files')
      .select('owner_id, bucket_id')
      .eq('file_id', fileId)
      .maybeSingle();

    if (!canManageFile(auth.session, existing, rawBucket)) {
      return res.status(403).json({ error: 'You do not have permission to delete this file.' });
    }

    const bucketId = resolveServerBucketId(rawBucket);
    await appwrite.storage.deleteFile(bucketId, fileId).catch(() => {});
    await supabaseAdmin.from('storage_files').delete().eq('file_id', fileId);

    if (rawBucket === 'profile-images') {
      await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: null, avatar_file_id: null })
        .eq('id', auth.session.userId)
        .eq('avatar_file_id', fileId);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[FORWORD storage] delete error:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Could not delete file. Please try again.' });
  }
}

export default { uploadStorageRouteHandler, replaceStorageRouteHandler, deleteStorageRouteHandler };
