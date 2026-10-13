import { AgentRuntimeError, type Message } from '@ayunis/agent-runtime';
import {
  selectCompleteTurns,
  type TurnSelection,
} from './complete-turn-selector';

interface HistoryBudget {
  readonly baseBudgetTokens: number;
  readonly reductionTokens: number;
  readonly rejectedMessageTokens?: number;
  readonly countTokens: (message: Message) => number;
}

export function selectBudgetedHistory(
  messages: readonly Message[],
  budget: HistoryBudget,
): TurnSelection<Message> {
  const selection = selectCompleteTurns(messages, {
    maxTokens: budget.baseBudgetTokens - budget.reductionTokens,
    countTokens: budget.countTokens,
  });
  if (selection.messages.length > 0) return selection;
  const fallback = latestTurnFallback(messages, budget);
  if (fallback) return fallback;
  throw new AgentRuntimeError(
    'CONTEXT_BUDGET_EXCEEDED',
    'The latest conversation turn exceeds the model context budget',
  );
}

function latestTurnFallback(
  messages: readonly Message[],
  budget: HistoryBudget,
): TurnSelection<Message> | undefined {
  if (budget.rejectedMessageTokens === undefined) return undefined;
  const latest = selectCompleteTurns(messages, {
    maxTokens: budget.baseBudgetTokens,
    maxTurns: 1,
    countTokens: budget.countTokens,
  });
  // A retry can drop all older turns even when they total less than the requested
  // reduction, but must never resend a turn the provider already rejected.
  return latest.messages.length > 0 &&
    latest.tokens < budget.rejectedMessageTokens
    ? latest
    : undefined;
}

export function tightenBudgetReduction(params: {
  readonly baseBudgetTokens: number;
  readonly reductionTokens: number;
  readonly sentMessageTokens: number;
  readonly reductionStepTokens: number;
}): number {
  const currentBudgetTokens = params.baseBudgetTokens - params.reductionTokens;
  const nextBudgetTokens =
    Math.min(currentBudgetTokens, params.sentMessageTokens) -
    params.reductionStepTokens;
  return params.baseBudgetTokens - nextBudgetTokens;
}
