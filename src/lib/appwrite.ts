import { Client, Storage } from 'appwrite';
import { safeMediaUrl, safeStorageRemove } from './format';
import { getAccessToken } from './supabase';

/**
 * Appwrite integration is strictly scoped to FILE STORAGE ONLY.
 * Authentication and Database are handled exclusively by Supabase.
 */

export const STORAGE_BUCKETS = {
  profileImages: 'profile-images',
  newsImages: 'news-images',
  brandLogos: 'brand-logos',
  offerBanners: 'offer-banners',
  productImages: 'product-images',
  documents: 'documents',
} as const;

export type StorageBucketKey = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
export const APPWRITE_ENDPOINT = (env.VITE_APPWRITE_ENDPOINT ?? '').trim().replace(/\/+$/, '');
export const APPWRITE_PROJECT_ID = (env.VITE_APPWRITE_PROJECT_ID ?? '').trim();
export const APPWRITE_DEFAULT_BUCKET_ID = (env.VITE_APPWRITE_BUCKET_ID ?? '').trim();

// All logical media categories share one physical Appwrite bucket.
// The category remains in Supabase metadata; the physical bucket is forword-media.

// Clear any legacy browser-stored Appwrite overrides.
safeStorageRemove('local', 'forword:appwrite-config');

export const isAppwriteStorageConfigured = Boolean(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID);

export const appwriteClient = new Client();
if (isAppwriteStorageConfigured) {
  appwriteClient.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
}

export const appwriteStorage = new Storage(appwriteClient);

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf', ...ALLOWED_IMAGE_MIME_TYPES] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const SAFE_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export function resolveBucketId(_bucket: StorageBucketKey): string {
  return APPWRITE_DEFAULT_BUCKET_ID || 'forword-media';
}

/**
 * Builds a safe Appwrite Storage preview/view URL from a file ID, "bucket:fileId" reference,
 * or returns an already-valid media URL unchanged.
 */
export function getAppwriteFileUrl(
  fileRef: string | null | undefined,
  bucket: StorageBucketKey,
  opts?: { width?: number; height?: number; quality?: number; mode?: 'preview' | 'view' },
): string | undefined {
  const raw = (fileRef ?? '').trim();
  if (!raw) return undefined;

  // Already a full http(s) URL or safe relative path
  const direct = safeMediaUrl(raw);
  if (direct && (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/'))) {
    return direct;
  }

  if (!isAppwriteStorageConfigured) return undefined;

  let targetBucket = resolveBucketId(bucket);
  let targetFileId = raw;

  if (raw.includes(':')) {
    const [maybeBucket, maybeId] = raw.split(':', 2);
    if (maybeBucket && maybeId && SAFE_ID_REGEX.test(maybeBucket) && SAFE_ID_REGEX.test(maybeId)) {
      targetBucket = maybeBucket;
      targetFileId = maybeId;
    }
  }

  if (!SAFE_ID_REGEX.test(targetBucket) || !SAFE_ID_REGEX.test(targetFileId)) {
    return undefined;
  }

  const endpoint = APPWRITE_ENDPOINT;
  const project = encodeURIComponent(APPWRITE_PROJECT_ID);
  const encodedBucket = encodeURIComponent(targetBucket);
  const encodedFile = encodeURIComponent(targetFileId);

  if (opts?.mode === 'view' || bucket === 'documents') {
    return `${endpoint}/storage/buckets/${encodedBucket}/files/${encodedFile}/view?project=${project}`;
  }

  const params = new URLSearchParams({ project: APPWRITE_PROJECT_ID });
  if (opts?.width && opts.width > 0) params.set('width', String(Math.round(opts.width)));
  if (opts?.height && opts.height > 0) params.set('height', String(Math.round(opts.height)));
  if (opts?.quality && opts.quality >= 1 && opts.quality <= 100) params.set('quality', String(Math.round(opts.quality)));

  return `${endpoint}/storage/buckets/${encodedBucket}/files/${encodedFile}/preview?${params.toString()}`;
}

export function resolveStorageMediaUrl(
  urlField: string | null | undefined,
  fileIdField: string | null | undefined,
  bucket: StorageBucketKey,
  opts?: { width?: number; height?: number; quality?: number },
): string | undefined {
  if (fileIdField && isAppwriteStorageConfigured) {
    const resolved = getAppwriteFileUrl(fileIdField, bucket, opts);
    if (resolved) return resolved;
  }
  return getAppwriteFileUrl(urlField, bucket, opts);
}

export function validateClientFile(
  file: { type: string; size: number; name: string },
  bucket: StorageBucketKey,
): { ok: true } | { ok: false; error: string } {
  const isDoc = bucket === 'documents';
  const allowed: readonly string[] = isDoc ? ALLOWED_DOCUMENT_MIME_TYPES : ALLOWED_IMAGE_MIME_TYPES;
  const maxSize = isDoc ? MAX_DOCUMENT_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

  if (!file.type || !allowed.includes(file.type.toLowerCase())) {
    return {
      ok: false,
      error: isDoc
        ? 'Only PDF, JPEG, PNG, WebP, or GIF files are allowed.'
        : 'Only JPEG, PNG, WebP, or GIF images are allowed.',
    };
  }
  if (file.size <= 0 || file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return { ok: false, error: `File size must be under ${maxMb} MB.` };
  }
  return { ok: true };
}

export interface UploadedStorageFile {
  fileId: string;
  bucketId: string;
  previewUrl: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
}

async function parseStorageResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || 'File storage operation failed. Please try again.');
  }
  return data;
}

/** Upload a file through the authenticated backend proxy to Appwrite Storage. */
export async function uploadStorageFile(
  file: File,
  bucket: StorageBucketKey,
  meta?: { entityType?: string; entityId?: string },
): Promise<UploadedStorageFile> {
  const check = validateClientFile(file, bucket);
  if (!check.ok) throw new Error(check.error);

  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in to upload files.');

  const form = new FormData();
  form.append('file', file);
  form.append('bucket', bucket);
  if (meta?.entityType) form.append('entityType', meta.entityType);
  if (meta?.entityId) form.append('entityId', meta.entityId);

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return parseStorageResponse<UploadedStorageFile>(res);
}

/** Replace an existing file in Appwrite Storage (uploads new file, updates Supabase ref, deletes old file). */
export async function replaceStorageFile(
  previousFileId: string,
  file: File,
  bucket: StorageBucketKey,
  meta?: { entityType?: string; entityId?: string },
): Promise<UploadedStorageFile> {
  const check = validateClientFile(file, bucket);
  if (!check.ok) throw new Error(check.error);

  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in to replace files.');

  const form = new FormData();
  form.append('file', file);
  form.append('bucket', bucket);
  if (meta?.entityType) form.append('entityType', meta.entityType);
  if (meta?.entityId) form.append('entityId', meta.entityId);

  const res = await fetch(`/api/storage/replace/${encodeURIComponent(previousFileId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return parseStorageResponse<UploadedStorageFile>(res);
}

/** Delete an authorized file from Appwrite Storage and remove its Supabase metadata. */
export async function deleteStorageFile(bucket: StorageBucketKey, fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in to delete files.');

  const res = await fetch(
    `/api/storage/${encodeURIComponent(bucket)}/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  await parseStorageResponse<{ ok: boolean }>(res);
}
