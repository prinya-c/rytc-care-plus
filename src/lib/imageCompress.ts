const MAX_DIMENSION = 1600;
const QUALITY = 0.75;

/**
 * Downscales and re-encodes an image file as WebP client-side before
 * upload, to keep Storage usage and load times down for phone-camera
 * photos. Falls back to returning the original file untouched if decoding
 * fails (e.g. a format the browser's canvas can't read, like some HEIC
 * files) — an upload should never be blocked by this.
 */
export async function toWebp(file: File): Promise<{ blob: Blob; extension: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
    if (!blob) throw new Error('canvas toBlob failed');
    return { blob, extension: 'webp' };
  } catch {
    return { blob: file, extension: (file.name.split('.').pop() || 'jpg').toLowerCase() };
  }
}
