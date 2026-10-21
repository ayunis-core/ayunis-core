export const MAX_IMAGES = 10;
// Images are downscaled before storage (messages module image upload policy),
// so the request may carry full-size phone photos.
export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MiB per image
export const MAX_TOTAL_SIZE_BYTES = 80 * 1024 * 1024; // 80 MiB total
// Raw upload bytes held in memory across all in-flight image messages. Sized
// against the app container's 10 GiB limit next to a 6 GiB heap ceiling and
// at most two decoded frames.
export const IMAGE_UPLOAD_BYTE_BUDGET = 1536 * 1024 * 1024;
export const IMAGE_UPLOAD_RETRY_AFTER_SECONDS = 5;
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
