/**
 * SDK-level retry count for transient provider failures, passed to every
 * `@ayunis` provider. Set explicitly (rather than relying on the provider
 * default) to preserve the pre-runtime handlers' 3-retry behavior as a
 * deliberate choice.
 */
export const INFERENCE_MAX_RETRIES = 3;
