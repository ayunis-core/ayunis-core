import type {
  ModelCallOutcomeSnapshot,
  ModelProvider,
  ProviderRequest,
  ReadonlySnapshot,
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

export function estimateRequestTokens(
  model: ModelProvider,
  request: ReadonlySnapshot<ProviderRequest>,
): RequestTokenEstimate {
  const estimator = budgetEstimator(model.tokenEstimator);
  return {
    exactTokenizer: estimator.exact,
    estimatedInputTokens:
      countFixedRequestTokens(request, estimator) +
      request.messages.reduce(
        (total, message) =>
          total + countMessageTokens(estimator, toRuntimeBudgetParts(message)),
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
