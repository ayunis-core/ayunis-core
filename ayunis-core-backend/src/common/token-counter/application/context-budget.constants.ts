export const MAX_CONTEXT_TOKENS = 200_000;

// History is trimmed at the tokenizer's safety ratio of the window minus the
// instructions and tool schemas sent with every call, so the warning allows
// for those and fires before any turn is dropped unless the request's fixed
// parts are unusually large.
const LONG_CHAT_WARNING_RATIO = 0.8;

// An exact tokenizer still misses a little request framing; an estimate from
// another provider's tokenizer needs real headroom (AYC-1255).
const EXACT_TOKENIZER_SAFETY_RATIO = 0.97;
const ESTIMATED_TOKENIZER_SAFETY_RATIO = 0.9;

export function getContextWindowTokens(contextWindowSize?: number): number {
  return contextWindowSize ?? MAX_CONTEXT_TOKENS;
}

export function getTokenizerSafetyRatio(exact: boolean): number {
  return exact
    ? EXACT_TOKENIZER_SAFETY_RATIO
    : ESTIMATED_TOKENIZER_SAFETY_RATIO;
}

/**
 * The history budget of one model call: the window scaled by the tokenizer's
 * safety ratio, minus the instructions and tool schemas sent with every call.
 */
export function getMessageBudgetTokens(
  contextWindowTokens: number,
  fixedTokens: number,
  safetyRatio: number,
): number {
  return Math.max(
    0,
    Math.floor(contextWindowTokens * safetyRatio) - fixedTokens,
  );
}

export function getLongChatWarningThresholdTokens(
  contextWindowSize?: number,
): number {
  return Math.floor(
    getContextWindowTokens(contextWindowSize) * LONG_CHAT_WARNING_RATIO,
  );
}
