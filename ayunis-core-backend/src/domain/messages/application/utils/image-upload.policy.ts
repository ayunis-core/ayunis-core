import type { ImageLimits } from '@ayunis/inference';
import {
  anthropicImageLimits,
  bedrockImageLimits,
} from '@ayunis/provider-anthropic';

// Every image in a thread is sent on every turn and the thread can switch
// models, so the strictest documented limit applies to all uploads: a larger
// image would break the thread for good. OpenAI caps the request, not the
// image; the other provider packages declare no per-image limit.
const providerImageLimits: readonly ImageLimits[] = [
  anthropicImageLimits,
  bedrockImageLimits,
];

export const MAX_IMAGE_SIZE_BYTES = Math.min(
  ...providerImageLimits.map((limit) => limit.maxImageBytes),
);
