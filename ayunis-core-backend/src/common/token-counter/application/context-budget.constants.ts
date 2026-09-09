export const MAX_CONTEXT_TOKENS = 200_000;

// Preserve the original 50k-of-80k warning headroom as the context budget grows.
export const LONG_CHAT_WARNING_THRESHOLD_TOKENS = (MAX_CONTEXT_TOKENS * 5) / 8;
