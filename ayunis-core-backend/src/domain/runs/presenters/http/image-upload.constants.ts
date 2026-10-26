export const MAX_IMAGES = 10;
// Images are downscaled before storage (messages module image upload policy),
// so the request may carry full-size phone photos.
export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MiB per image
export const MAX_TOTAL_SIZE_BYTES = 80 * 1024 * 1024; // 80 MiB total
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
