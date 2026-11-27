import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppwritePreviewUrl,
  canManageFile,
  canWriteToBucket,
  isLogicalBucket,
  sanitizeUploadFilename,
  sniffFileMagicBytes,
  validateServerUpload,
} from '../../server/storageService';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PDF_HEADER = Buffer.from('%PDF-1.7\n%sample', 'ascii');
const SVG_PAYLOAD = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>', 'utf8');

test('storageService magic-byte validation accepts real PNG/JPEG/PDF and blocks spoofed SVG/scripts', () => {
  assert.equal(sniffFileMagicBytes(PNG_HEADER), 'image/png');
  assert.equal(sniffFileMagicBytes(JPEG_HEADER), 'image/jpeg');
  assert.equal(sniffFileMagicBytes(PDF_HEADER), 'application/pdf');
  assert.equal(sniffFileMagicBytes(SVG_PAYLOAD), null);

  // Valid PNG avatar
  const okPng = validateServerUpload(
    { buffer: PNG_HEADER, mimetype: 'image/png', originalname: '../../avatar (1).png', size: PNG_HEADER.length },
    'profile-images',
  );
  assert.equal(okPng.ok, true);
  if (okPng.ok) {
    assert.equal(okPng.mimeType, 'image/png');
    assert.equal(okPng.fileName.includes('..'), false);
    assert.ok(okPng.fileName.endsWith('.png'));
  }

  // Spoofed MIME: declares image/png but payload is SVG/HTML XSS
  const spoofed = validateServerUpload(
    { buffer: SVG_PAYLOAD, mimetype: 'image/png', originalname: 'evil.png', size: SVG_PAYLOAD.length },
    'profile-images',
  );
  assert.equal(spoofed.ok, false);

  // PDF blocked in image buckets, allowed in documents bucket
  assert.equal(
    validateServerUpload({ buffer: PDF_HEADER, mimetype: 'application/pdf', originalname: 'kyc.pdf', size: PDF_HEADER.length }, 'profile-images').ok,
    false,
  );
  assert.equal(
    validateServerUpload({ buffer: PDF_HEADER, mimetype: 'application/pdf', originalname: 'kyc.pdf', size: PDF_HEADER.length }, 'documents').ok,
    true,
  );

  // Oversized image (>5MB) rejected with 413
  const big = validateServerUpload(
    { buffer: PNG_HEADER, mimetype: 'image/png', originalname: 'big.png', size: 6 * 1024 * 1024 },
    'profile-images',
  );
  assert.equal(big.ok, false);
  if (!big.ok) assert.equal(big.status, 413);
});

test('storageService enforces strict bucket RBAC and file ownership checks', () => {
  assert.equal(isLogicalBucket('profile-images'), true);
  assert.equal(isLogicalBucket('news-images'), true);
  assert.equal(isLogicalBucket('../secrets'), false);

  const regularUser = { userId: 'u-1', email: 'u1@example.com', name: 'U1', role: 'user' as const };
  const adminUser = { userId: 'u-admin', email: 'admin@forword.in', name: 'Admin', role: 'admin' as const };

  // Regular users can upload to profile-images & documents, NEVER admin content buckets
  assert.equal(canWriteToBucket(regularUser, 'profile-images'), true);
  assert.equal(canWriteToBucket(regularUser, 'documents'), true);
  assert.equal(canWriteToBucket(regularUser, 'news-images'), false);
  assert.equal(canWriteToBucket(regularUser, 'brand-logos'), false);
  assert.equal(canWriteToBucket(regularUser, 'offer-banners'), false);
  assert.equal(canWriteToBucket(regularUser, 'product-images'), false);

  // Admin can write to all buckets
  assert.equal(canWriteToBucket(adminUser, 'news-images'), true);
  assert.equal(canWriteToBucket(adminUser, 'offer-banners'), true);

  // Ownership check on replace/delete
  assert.equal(canManageFile(regularUser, { owner_id: 'u-1' }, 'profile-images'), true);
  assert.equal(canManageFile(regularUser, { owner_id: 'u-2' }, 'profile-images'), false);
  assert.equal(canManageFile(regularUser, null, 'profile-images'), false);
  assert.equal(canManageFile(adminUser, { owner_id: 'u-2' }, 'news-images'), true);
});

test('storageService sanitizes filenames and builds safe Appwrite preview/view URLs', () => {
  assert.equal(sanitizeUploadFilename('../../etc/passwd.jpg', 'image/jpeg'), 'passwd.jpg');
  const imgUrl = buildAppwritePreviewUrl('https://cloud.appwrite.io/v1/', 'proj123', 'profile-images', 'file999', 'profile-images');
  assert.equal(imgUrl, 'https://cloud.appwrite.io/v1/storage/buckets/profile-images/files/file999/preview?project=proj123');
  const docUrl = buildAppwritePreviewUrl('https://cloud.appwrite.io/v1', 'proj123', 'documents', 'doc1', 'documents');
  assert.equal(docUrl, 'https://cloud.appwrite.io/v1/storage/buckets/documents/files/doc1/view?project=proj123');
});
