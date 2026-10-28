import type {
  AfterModelCallContext,
  BeforeModelCallContext,
  BeforeModelTurnContext,
  Hook,
  Message,
  ModelCallOutcomeSnapshot,
  ProviderFailureFacts,
  ReadonlySnapshot,
  RunContext,
  TokenEstimator,
} from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import {
  budgetEstimator,
  countMessageTokens,
  getContextOverflowReductionTokens,
  getContextWindowTokens,
  getMessageBudget,
  type BudgetModel,
  type MessageBudgetParams,
} from 'src/common/token-counter/application/util/context-budget.helper';
import {
  selectBudgetedHistory,
  tightenBudgetReduction,
} from 'src/domain/runs/application/agent-runtime/context-budget.policy';
import { toRuntimeBudgetParts } from 'src/domain/runs/application/agent-runtime/runtime-message-parts.helper';

interface ContextBudgetHookParams {
  model: BudgetModel;
}
const CONTEXT_BUDGET_STATE = Symbol('ayunis:contextBudget');

interface ContextBudgetState {
  reductionTokens: number;
  rejectedMessageTokens?: number;
  lastRequest?: { baseBudgetTokens: number; messageTokens: number };
}

@Injectable()
export class ContextBudgetHookFactory {
  private readonly logger = new Logger(ContextBudgetHookFactory.name);

  create(params: ContextBudgetHookParams): Hook {
    return {
      name: 'ayunis-context-budget',
      inheritToChildRuns: false,
      beforeModelTurn: (ctx) => this.trimTurn(ctx, params.model),
      beforeModelCall: (ctx) => this.trimCall(ctx, params.model),
      afterModelCall: (ctx) => this.tightenAfterRejection(ctx, params.model),
    };
  }

  private trimTurn(ctx: BeforeModelTurnContext, model: BudgetModel): void {
    const state = budgetState(ctx.context);
    state.rejectedMessageTokens = undefined;
    ctx.transformMessages((messages) =>
      trimHistory(messages, state, {
        instructions: ctx.instructions,
        tools: ctx.tools,
        model,
        tokenEstimator: ctx.model.tokenEstimator,
      }),
    );
  }

  private trimCall(ctx: BeforeModelCallContext, model: BudgetModel): void {
    const state = budgetState(ctx.context);
    // Recovery calls can change instructions and tools, so price the actual call.
    ctx.transformMessages((messages) =>
      trimHistory(messages, state, {
        instructions: ctx.request.instructions,
        tools: ctx.request.tools,
        model,
        tokenEstimator: ctx.model.tokenEstimator,
      }),
    );
  }

  private tightenAfterRejection(
    ctx: AfterModelCallContext,
    model: BudgetModel,
  ): void {
    const failure = contextLengthRejection(ctx.outcome);
    if (!failure) return;
    const state = budgetState(ctx.context);
    const request = state.lastRequest;
    if (!request) return;
    const contextWindowTokens = getContextWindowTokens(model.contextWindowSize);
    state.rejectedMessageTokens = request.messageTokens;
    state.reductionTokens = tightenBudgetReduction({
      baseBudgetTokens: request.baseBudgetTokens,
      reductionTokens: state.reductionTokens,
      sentMessageTokens: request.messageTokens,
      reductionStepTokens: getContextOverflowReductionTokens(
        contextWindowTokens,
        failure.contextOverflowTokens,
      ),
    });
    this.logger.warn(
      {
        modelCallId: ctx.modelCallId,
        contextWindowTokens,
        contextOverflowTokens: failure.contextOverflowTokens,
        messageBudgetTokens: request.baseBudgetTokens - state.reductionTokens,
      },
      'Provider rejected the request as too long; trimming more history before the retry',
    );
  }
}

function trimHistory(
  messages: readonly Message[],
  state: ContextBudgetState,
  request: MessageBudgetParams,
): Message[] {
  const estimator: TokenEstimator = budgetEstimator(request.tokenEstimator);
  const baseBudgetTokens = getMessageBudget(request);
  const selection = selectBudgetedHistory(messages, {
    baseBudgetTokens,
    reductionTokens: state.reductionTokens,
    rejectedMessageTokens: state.rejectedMessageTokens,
    countTokens: (message) =>
      countMessageTokens(estimator, toRuntimeBudgetParts(message)),
  });
  state.lastRequest = { baseBudgetTokens, messageTokens: selection.tokens };
  return selection.messages;
}

function budgetState(context: RunContext): ContextBudgetState {
  const existing = context.get<ContextBudgetState>(CONTEXT_BUDGET_STATE);
  if (existing) return existing;
  const state: ContextBudgetState = { reductionTokens: 0 };
  context.set(CONTEXT_BUDGET_STATE, state);
  return state;
}

function contextLengthRejection(
  outcome: ModelCallOutcomeSnapshot,
): ReadonlySnapshot<ProviderFailureFacts> | undefined {
  if (outcome.type !== 'provider_failure') return undefined;
  const failure = outcome.providerFailure;
  return failure.kind === 'rejection' &&
    failure.rejectionReason === 'context_length_exceeded'
    ? failure
    : undefined;
}
