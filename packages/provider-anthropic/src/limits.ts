import type { ProviderLimits } from '@ayunis/inference';

// Anthropic and Bedrock reject an image whose base64 encoding exceeds 5 MB and
// downscale anything with a longer edge than 1568 px before the model sees it.
export const ANTHROPIC_LIMITS: ProviderLimits = {
  image: { maxBase64Bytes: 5 * 1024 * 1024, maxEdgePx: 1568 },
};
