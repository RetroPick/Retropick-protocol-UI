/**
 * Client-side preparation and upload of launch logo images to the media service
 * (same-origin /api/media, dev-proxied to apps/media-service like /api/referrals).
 * Limits mirror the service contract; the service re-validates everything.
 */

const RAW_MAX_BYTES = 5 * 1024 * 1024;
const TARGET_MAX_BYTES = 256 * 1024;
const PASS_MAX_BYTES = 2 * 1024 * 1024;
const GIF_MAX_BYTES = 512 * 1024;
const MAX_EDGE = 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export type UploadResult = { uri: string; https: string | null; hash: string; bytes: number; mime: string; mode: 'pinata' | 'local' };

async function encodeBitmap(bitmap: ImageBitmap, type: string, quality: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

/** Downscales and re-encodes images so uploads stay small; GIFs pass through untouched to preserve animation. */
export async function prepareLogoFile(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw Error('Use a PNG, JPEG, WebP or GIF image.');
  if (file.size > RAW_MAX_BYTES) throw Error('Keep the image under 5 MB.');
  if (file.type === 'image/gif') {
    if (file.size > GIF_MAX_BYTES) throw Error('GIFs must stay under 512 KB to keep animation. Use a static image instead.');
    return file;
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw Error('That image could not be read.');
  try {
    const attempts: { type: string; quality: number }[] = [
      { type: 'image/webp', quality: 0.9 }, { type: 'image/webp', quality: 0.75 }, { type: 'image/webp', quality: 0.6 },
      { type: 'image/jpeg', quality: 0.85 }, { type: 'image/png', quality: 1 },
    ];
    let smallest: Blob | null = null;
    for (const attempt of attempts) {
      const blob = await encodeBitmap(bitmap, attempt.type, attempt.quality);
      if (!blob) continue;
      if (blob.type === 'image/webp' && blob.size <= TARGET_MAX_BYTES) return blob;
      if (!smallest || blob.size < smallest.size) smallest = blob;
    }
    if (smallest && smallest.size <= PASS_MAX_BYTES) return smallest;
    throw Error('That image could not be compressed small enough. Try a simpler image.');
  } finally { bitmap.close(); }
}

export async function uploadLogo(blob: Blob): Promise<UploadResult> {
  const form = new FormData();
  const ext = (blob.type.split('/')[1] ?? 'png').replace('jpeg', 'jpg');
  form.append('file', blob, `logo.${ext}`);
  let response: Response;
  try { response = await fetch('/api/media/upload', { method: 'POST', body: form }); }
  catch { throw Error('The image service is unreachable. You can still paste a logo URI.'); }
  const value = await response.json().catch(() => null) as (UploadResult & { error?: string }) | null;
  if (!response.ok || !value?.uri) {
    if (response.status === 413) throw Error('The image is too large after compression.');
    if (response.status === 415) throw Error('That image type is not supported.');
    if (response.status === 429) throw Error('Too many uploads. Wait a minute and retry.');
    if (response.status === 403) throw Error('This site is not allowed to upload images right now.');
    throw Error(`Image upload failed (${value?.error ?? response.status}).`);
  }
  return value;
}
