export const MAX_IMAGES = 8;
// Thread uploads must fit the strictest supported provider: 5 MiB of base64.
export const MAX_IMAGE_SIZE_BYTES = (5 * 1024 * 1024 * 3) / 4;
export const MAX_IMAGE_SIZE_MIB = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
