import {
  estimatedTokens,
  type TokenEstimator,
  type ToolDescription,
} from '@ayunis/inference';

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

export interface BudgetModel {
  readonly provider: string;
  readonly name: string;
  readonly contextWindowSize?: number;
}

export interface MessageBudgetParams {
  readonly instructions: string;
  readonly tools: readonly ToolDescription[];
  readonly model: BudgetModel;
  /** The provider's own estimator; the shared estimate applies without one. */
  readonly tokens?: TokenEstimator;
}

export type MessagePart =
  { readonly kind: 'text'; readonly text: string } | { readonly kind: 'image' };

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

/** The estimator a budget is counted with: the provider's own, or the shared estimate. */
export function budgetEstimator(tokens?: TokenEstimator): TokenEstimator {
  return tokens ?? estimatedTokens();
}

export function countRequestTokens(
  request: MessageBudgetParams,
  estimator: TokenEstimator,
): number {
  return (
    estimator.countText(request.instructions) +
    estimator.countTools(request.tools)
  );
}

/** The history budget of one model call, shared by the hook and the history materializer. */
export function getMessageBudget(params: MessageBudgetParams): number {
  const estimator = budgetEstimator(params.tokens);
  return getMessageBudgetTokens(
    getContextWindowTokens(params.model.contextWindowSize),
    countRequestTokens(params, estimator),
    getTokenizerSafetyRatio(estimator.exact),
  );
}

export function countMessageTokens(
  estimator: TokenEstimator,
  parts: readonly MessagePart[],
): number {
  return parts.reduce(
    (total, part) =>
      total +
      (part.kind === 'image'
        ? estimator.tokensPerImage
        : estimator.countText(part.text)),
    estimator.tokensPerMessage,
  );
}

/**
 * Prices a whole thread in one tokenizer call: every text part joined by a
 * newline, each image at its fixed cost, each message with its framing. The
 * joins can shift the total by a few tokens against summing
 * `countMessageTokens` per message, which a warning tolerates and a budget
 * does not.
 */
export function countThreadTokens(
  estimator: TokenEstimator,
  messages: ReadonlyArray<readonly MessagePart[]>,
): number {
  const parts = messages.flat();
  const texts = parts.flatMap((part) =>
    part.kind === 'text' ? [part.text] : [],
  );
  const images = parts.length - texts.length;
  return (
    estimator.countText(texts.join('\n')) +
    images * estimator.tokensPerImage +
    messages.length * estimator.tokensPerMessage
  );
}

export function getLongChatWarningThresholdTokens(
  contextWindowSize?: number,
): number {
  return Math.floor(
    getContextWindowTokens(contextWindowSize) * LONG_CHAT_WARNING_RATIO,
  );
}

// When the provider still rejects the request as too long, the retry drops
// history by the reported overflow plus this share of the window: the overflow
// is measured in the provider's tokens, the budget in ours.
const CONTEXT_OVERFLOW_RETRY_MARGIN_RATIO = 0.05;

// Applies when the rejection carries no token counts.
const CONTEXT_OVERFLOW_RETRY_FALLBACK_RATIO = 0.1;

export function getContextOverflowReductionTokens(
  contextWindowTokens: number,
  overflowTokens?: number,
): number {
  if (overflowTokens === undefined) {
    return Math.floor(
      contextWindowTokens * CONTEXT_OVERFLOW_RETRY_FALLBACK_RATIO,
    );
  }
  return (
    overflowTokens +
    Math.floor(contextWindowTokens * CONTEXT_OVERFLOW_RETRY_MARGIN_RATIO)
  );
}
