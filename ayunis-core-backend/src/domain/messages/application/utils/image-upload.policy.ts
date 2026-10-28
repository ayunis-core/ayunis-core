import type { ImageLimits } from '@ayunis/inference';
import {
  anthropicImageLimits,
  bedrockImageLimits,
} from '@ayunis/provider-anthropic';

const MIB = 1024 * 1024;

// Every image in a thread is sent on every turn and the thread can switch
// models, so the strictest documented limit applies to every stored image: a
// larger image would break the thread for good. OpenAI caps the request, not
// the image; the other provider packages declare no per-image limit.
const providerImageLimits: readonly ImageLimits[] = [
  anthropicImageLimits,
  bedrockImageLimits,
];

export const MAX_IMAGE_SIZE_BYTES = Math.min(
  ...providerImageLimits.map((limit) => limit.maxImageBytes),
);

// Uploads are downscaled before storage, so they may exceed the stored-image
// ceiling. These bound the raw request and the decoder's memory.
export const MAX_UPLOAD_IMAGE_SIZE_BYTES = 20 * MIB;
export const MAX_TOTAL_UPLOAD_IMAGE_SIZE_BYTES = 80 * MIB;
export const MAX_IMAGE_INPUT_PIXELS = 50_000_000;

// Providers downscale anything larger before the model sees it: OpenAI fits
// high-detail images into 2048 px, Anthropic into 1568 px.
export const MAX_IMAGE_LONG_EDGE_PX = 2048;
