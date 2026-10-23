export const MAX_IMAGES = 8;
// The backend downscales images before storing them, so full-size phone photos
// fit; these mirror its per-image and per-message upload limits.
export const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_SIZE_MIB = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
export const MAX_TOTAL_IMAGE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_TOTAL_IMAGE_SIZE_MIB =
  MAX_TOTAL_IMAGE_SIZE_BYTES / (1024 * 1024);
