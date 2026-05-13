// Downsample to this many px on the longest side before sampling. 64 is
// enough to identify dominant colors in a logo while keeping the pixel
// count under 4K and edge anti-aliasing noise low.
const MAX_DIMENSION = 64;
// Pixels less opaque than this are treated as background — typical logo
// PNGs have alpha=0 for transparent backgrounds; we allow a small fringe.
const MIN_ALPHA = 200;
// Skip near-white and near-black pixels — almost always background or
// outline, not brand color. Tuned so muted brand colors still survive.
const MAX_LIGHTNESS = 0.92;
const MIN_LIGHTNESS = 0.08;
// Skip grayscale pixels — they're not "colors" in the brand sense.
const MIN_SATURATION = 0.18;
// 5 bits per channel = 32 levels each = 32k buckets. Pixels within ~8 RGB
// values of each other land in the same bucket, smoothing anti-aliasing.
const BUCKET_BITS = 5;
// Reject candidate colors that are within this Euclidean RGB distance of
// an already-picked one — prevents returning five shades of the same hue.
const MIN_PERCEPTUAL_DISTANCE = 48;

interface RgbBucket {
  r: number;
  g: number;
  b: number;
  n: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export async function extractLogoColors(
  source: File | string,
  maxColors = 5,
): Promise<string[]> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(source);
  } catch {
    return [];
  }
  const data = getImageData(img);
  if (!data) return [];
  const buckets = bucketize(data);
  return pickDistinctColors(buckets, maxColors).map(toHex);
}

async function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const isFile = typeof source !== 'string';
    const url = isFile ? URL.createObjectURL(source) : source;
    const cleanup = () => {
      if (isFile) URL.revokeObjectURL(url);
    };
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

function getImageData(img: HTMLImageElement): Uint8ClampedArray | null {
  const canvas = document.createElement('canvas');
  const scale = Math.min(
    MAX_DIMENSION / img.naturalWidth,
    MAX_DIMENSION / img.naturalHeight,
    1,
  );
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  try {
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return null;
  }
}

function bucketize(data: Uint8ClampedArray): Map<number, RgbBucket> {
  const counts = new Map<number, RgbBucket>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < MIN_ALPHA) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isUninteresting(r, g, b)) continue;
    const key = quantizeKey(r, g, b);
    const existing = counts.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.n += 1;
    } else {
      counts.set(key, { r, g, b, n: 1 });
    }
  }
  return counts;
}

function quantizeKey(r: number, g: number, b: number): number {
  const shift = 8 - BUCKET_BITS;
  return (
    ((r >> shift) << (BUCKET_BITS * 2)) |
    ((g >> shift) << BUCKET_BITS) |
    (b >> shift)
  );
}

function isUninteresting(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  if (lightness > MAX_LIGHTNESS || lightness < MIN_LIGHTNESS) return true;
  const denom = 1 - Math.abs(2 * lightness - 1);
  const saturation = denom === 0 ? 0 : (max - min) / denom;
  return saturation < MIN_SATURATION;
}

function pickDistinctColors(
  buckets: Map<number, RgbBucket>,
  maxColors: number,
): Rgb[] {
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const picked: Rgb[] = [];
  for (const bucket of sorted) {
    const avg: Rgb = {
      r: Math.round(bucket.r / bucket.n),
      g: Math.round(bucket.g / bucket.n),
      b: Math.round(bucket.b / bucket.n),
    };
    if (picked.every((p) => distance(p, avg) >= MIN_PERCEPTUAL_DISTANCE)) {
      picked.push(avg);
      if (picked.length >= maxColors) break;
    }
  }
  return picked;
}

function distance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function toHex({ r, g, b }: Rgb): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
