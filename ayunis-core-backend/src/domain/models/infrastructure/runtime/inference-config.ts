/**
 * SDK-level retry count for non-streaming inference paths that do not run
 * through the agent runtime's per-attempt hooks.
 */
export const INFERENCE_MAX_RETRIES = 3;

/**
 * Runtime streaming owns retries above the per-attempt usage hooks, so SDKs
 * must expose each HTTP attempt instead of retrying invisibly underneath it.
 */
export const STREAM_INFERENCE_MAX_RETRIES = 0;
