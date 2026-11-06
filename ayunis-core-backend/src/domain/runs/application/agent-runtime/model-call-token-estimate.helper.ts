import type {
  ModelCallOutcomeSnapshot,
  ModelProvider,
  ProviderRequest,
  ReadonlySnapshot,
  TokenEstimator,
} from '@ayunis/agent-runtime';
import {
  budgetEstimator,
  countFixedRequestTokens,
  countMessageTokens,
} from 'src/common/token-counter/application/util/context-budget.helper';
import { toRuntimeBudgetParts } from 'src/domain/runs/application/agent-runtime/runtime-message-parts.helper';

export interface RequestTokenEstimate {
  readonly estimatedInputTokens: number;
  readonly exactTokenizer: boolean;
}

/** Prices the request as the context budget does: each image at its ceiling. */
export function estimateRequestTokens(
  model: ModelProvider,
  request: ReadonlySnapshot<ProviderRequest>,
): RequestTokenEstimate {
  return countRequestTokens(
    model,
    request,
    (estimator) => estimator.tokensPerImage,
  );
}

/**
 * Prices the request for billing when the provider never reports usage: each
 * image at the cheapest cost the provider bills, so the charge cannot exceed
 * what the call could have cost.
 */
export function estimateBillableRequestTokens(
  model: ModelProvider,
  request: ReadonlySnapshot<ProviderRequest>,
): RequestTokenEstimate {
  return countRequestTokens(
    model,
    request,
    (estimator) => estimator.minTokensPerImage,
  );
}

function countRequestTokens(
  model: ModelProvider,
  request: ReadonlySnapshot<ProviderRequest>,
  imageTokens: (estimator: TokenEstimator) => number,
): RequestTokenEstimate {
  const estimator = budgetEstimator(model.tokenEstimator);
  const tokensPerImage = imageTokens(estimator);
  return {
    exactTokenizer: estimator.exact,
    estimatedInputTokens:
      countFixedRequestTokens(request, estimator) +
      request.messages.reduce(
        (total, message) =>
          total +
          countMessageTokens(
            estimator,
            toRuntimeBudgetParts(message),
            tokensPerImage,
          ),
        0,
      ),
  };
}

export function estimateOutputTokens(
  model: ModelProvider,
  outcome: ModelCallOutcomeSnapshot,
): number {
  const estimator = budgetEstimator(model.tokenEstimator);
  const texts = [
    ...toRuntimeBudgetParts(outcome.message).flatMap((part) =>
      part.kind === 'text' ? [part.text] : [],
    ),
    ...outcome.partialToolCalls.map(
      (call) => `${call.name ?? ''} ${call.argumentsJson}`,
    ),
  ];
  return texts.reduce((total, text) => total + estimator.countText(text), 0);
}
