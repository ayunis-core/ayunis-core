export const MAX_CONTEXT_TOKENS = 200_000;

const LONG_CHAT_WARNING_RATIO = 0.9;

export function getContextWindowTokens(contextWindowSize?: number): number {
  return contextWindowSize ?? MAX_CONTEXT_TOKENS;
}

export function getLongChatWarningThresholdTokens(
  contextWindowSize?: number,
): number {
  return Math.floor(
    getContextWindowTokens(contextWindowSize) * LONG_CHAT_WARNING_RATIO,
  );
}
