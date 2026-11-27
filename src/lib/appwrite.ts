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

const BUCKET_ENV_OVERRIDES: Record<StorageBucketKey, string | undefined> = {
  // The Appwrite project currently has one bucket; profile images share it under a logical namespace.
  'profile-images': env.VITE_APPWRITE_BUCKET_PROFILE_IMAGES?.trim() || 'forword-media',
  'news-images': env.VITE_APPWRITE_BUCKET_NEWS_IMAGES?.trim(),
  'brand-logos': env.VITE_APPWRITE_BUCKET_BRAND_LOGOS?.trim(),
  'offer-banners': env.VITE_APPWRITE_BUCKET_OFFER_BANNERS?.trim(),
  'product-images': env.VITE_APPWRITE_BUCKET_PRODUCT_IMAGES?.trim(),
  documents: env.VITE_APPWRITE_BUCKET_DOCUMENTS?.trim(),
};

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
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB for editorial images
export const MAX_PROFILE_IMAGE_SIZE_BYTES = 200 * 1024; // hard 200 KB profile-photo limit
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const SAFE_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export function resolveBucketId(bucket: StorageBucketKey): string {
  return BUCKET_ENV_OVERRIDES[bucket] || bucket || APPWRITE_DEFAULT_BUCKET_ID;
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
  const isProfile = bucket === 'profile-images';
  const allowed: readonly string[] = isDoc
    ? ALLOWED_DOCUMENT_MIME_TYPES
    : isProfile ? ['image/jpeg'] : ALLOWED_IMAGE_MIME_TYPES;
  const maxSize = isDoc ? MAX_DOCUMENT_SIZE_BYTES : isProfile ? MAX_PROFILE_IMAGE_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

  if (!file.type || !allowed.includes(file.type.toLowerCase())) {
    return {
      ok: false,
      error: isDoc
        ? 'Only PDF, JPEG, PNG, WebP, or GIF files are allowed.'
        : 'Only JPEG, PNG, WebP, or GIF images are allowed.',
    };
  }
  if (file.size <= 0 || file.size > maxSize) {
    const limit = isProfile ? '200 KB' : `${Math.round(maxSize / (1024 * 1024))} MB`;
    return { ok: false, error: `File size must be under ${limit}.` };
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


/** Resize and re-encode profile photos before upload; the returned JPEG is always <= 200 KB. */
export async function compressProfileImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a valid image.');
  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser cannot compress images. Please use an updated browser.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const maxBytes = MAX_PROFILE_IMAGE_SIZE_BYTES;
    const dimensions = [512, 448, 384, 320, 256, 192];
    const qualities = [0.86, 0.80, 0.74, 0.68, 0.62, 0.56, 0.50, 0.44, 0.38];
    for (const maxDimension of dimensions) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Image compression is unavailable on this device.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of qualities) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size > 0 && blob.size <= maxBytes) {
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'profile-photo';
          return new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        }
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error('Could not compress this photo below 200 KB. Please choose another image.');
}

/** Upload a file through the authenticated backend proxy to Appwrite Storage. */
export async function uploadStorageFile(
  file: File,
  bucket: StorageBucketKey,
  meta?: { entityType?: string; entityId?: string },
): Promise<UploadedStorageFile> {
  const uploadFile = bucket === 'profile-images' ? await compressProfileImage(file) : file;
  const check = validateClientFile(uploadFile, bucket);
  if (!check.ok) throw new Error(check.error);

  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in to upload files.');

  const form = new FormData();
  form.append('file', uploadFile);
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
