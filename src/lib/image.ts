const TARGET_BYTES = 100 * 1024;
const MAX_EDGE = 1600;
const MIN_QUALITY = 0.42;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Image compression failed.')), type, quality);
  });
}

/**
 * Compress an image before uploading it.
 * Resizes large images and iteratively lowers quality to target <100 KB.
 * Returns a WebP file where supported by the browser; otherwise JPEG.
 */
export async function compressImage(
  source: File,
  options: { targetBytes?: number; maxEdge?: number } = {},
): Promise<File> {
  if (!source.type.startsWith('image/')) throw new Error('Please select an image file.');
  if (source.type === 'image/svg+xml' || source.type === 'image/gif') {
    throw new Error('SVG and animated GIF files are not supported by the image compressor.');
  }

  const targetBytes = options.targetBytes ?? TARGET_BYTES;
  const maxEdge = options.maxEdge ?? MAX_EDGE;
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot process this image.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // WebP is substantially smaller for most photos. Test support before choosing it.
    let mime = 'image/webp';
    let blob = await canvasBlob(canvas, mime, 0.78);
    if (blob.type !== 'image/webp') {
      mime = 'image/jpeg';
      blob = await canvasBlob(canvas, mime, 0.78);
    }

    // Reduce quality first, then dimensions, until the target size is reached.
    let quality = 0.78;
    while (blob.size > targetBytes && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.08);
      blob = await canvasBlob(canvas, mime, quality);
    }

    while (blob.size > targetBytes && canvas.width > 480 && canvas.height > 480) {
      const nextWidth = Math.max(480, Math.round(canvas.width * 0.82));
      const nextHeight = Math.max(480, Math.round(canvas.height * 0.82));
      const smaller = document.createElement('canvas');
      smaller.width = nextWidth;
      smaller.height = nextHeight;
      const smallerCtx = smaller.getContext('2d');
      if (!smallerCtx) break;
      smallerCtx.drawImage(canvas, 0, 0, nextWidth, nextHeight);
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      const resizedCtx = canvas.getContext('2d');
      if (!resizedCtx) break;
      resizedCtx.drawImage(smaller, 0, 0);
      blob = await canvasBlob(canvas, mime, MIN_QUALITY);
    }

    if (blob.size > targetBytes) {
      throw new Error('This image could not be reduced below 100 KB. Choose a smaller image or lower-resolution version.');
    }

    const extension = mime === 'image/webp' ? 'webp' : 'jpg';
    const baseName = source.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], baseName + '.' + extension, { type: mime, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

export function formatImageSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
