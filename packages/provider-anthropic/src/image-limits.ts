import { rawBytesWithinBase64, type ImageLimits } from '@ayunis/inference';

// Documented per-image ceilings, stated as base64 size:
// https://platform.claude.com/docs/en/build-with-claude/vision#request-limits
const MIB = 1024 * 1024;

/** The Claude API accepts up to 10 MiB of base64 per image. */
export const anthropicImageLimits: ImageLimits = {
  maxImageBytes: rawBytesWithinBase64(10 * MIB),
};

/** Amazon Bedrock accepts up to 5 MiB of base64 per image. */
export const bedrockImageLimits: ImageLimits = {
  maxImageBytes: rawBytesWithinBase64(5 * MIB),
};
