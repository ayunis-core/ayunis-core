export const MAX_IMAGES = 10;
// Images are downscaled before storage (messages module image upload policy),
// so the request may carry full-size phone photos.
export const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB per image
export const MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024; // 100MB total
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
