import {
  AgentRuntimeError,
  type AfterModelCallContext,
  type BeforeModelCallContext,
  type BeforeModelTurnContext,
  type Hook,
  type Message,
  type MessageContent,
  type ModelCallOutcomeSnapshot,
  type ProviderFailureFacts,
  type ReadonlySnapshot,
  type RunContext,
  type TokenEstimator,
} from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import {
  budgetEstimator,
  countMessageTokens,
  countRequestTokens,
  getContextOverflowReductionTokens,
  getContextWindowTokens,
  getMessageBudgetTokens,
  getTokenizerSafetyRatio,
  type BudgetModel,
  type MessagePart,
} from 'src/common/token-counter/application/util/context-budget.helper';
import { selectCompleteTurns } from 'src/domain/runs/application/agent-runtime/complete-turn-selector';

interface ContextBudgetHookParams {
  model: BudgetModel;
}

/** Per-run RunContext key for the budget state shared by the hook phases. */
const CONTEXT_BUDGET_STATE = Symbol('ayunis:contextBudget');

interface ContextBudgetState {
  /** Message budget of the current model turn before any overflow reduction. */
  turnBudget: number;
  /** Tokens of the instructions and tool schemas of the current turn. */
  turnFixedTokens: number;
  /** Tokens removed from every later request after the provider rejected one as too long. */
  reduction: number;
  /** The reduction the turn's own trim already applied to its messages. */
  appliedReduction: number;
  /** Message tokens of the request the hook last trimmed for. */
  sentMessageTokens?: number;
  /** Message tokens of the request the provider last rejected as too long. */
  rejectedMessageTokens?: number;
  /** Estimate of the whole request the hook last trimmed for. */
  estimatedRequestTokens?: number;
}

@Injectable()
export class ContextBudgetHookFactory {
  private readonly logger = new Logger(ContextBudgetHookFactory.name);

  create(params: ContextBudgetHookParams): Hook {
    return {
      name: 'ayunis-context-budget',
      inheritToChildRuns: false,
      beforeModelTurn: (ctx) => this.trimTurn(ctx, params.model),
      beforeModelCall: (ctx) => this.retrimBeforeRetry(ctx),
      afterModelCall: (ctx) => {
        this.tightenAfterRejection(ctx, params.model);
        this.compareWithProviderCount(ctx, params.model);
      },
    };
  }

  private trimTurn(ctx: BeforeModelTurnContext, model: BudgetModel): void {
    const estimator = budgetEstimator(ctx.model.tokens);
    const state = budgetState(ctx.context);
    state.turnFixedTokens = countRequestTokens(
      { instructions: ctx.instructions, tools: ctx.tools, model },
      estimator,
    );
    state.turnBudget = getMessageBudgetTokens(
      getContextWindowTokens(model.contextWindowSize),
      state.turnFixedTokens,
      getTokenizerSafetyRatio(estimator.exact),
    );
    state.appliedReduction = state.reduction;
    ctx.transformMessages((messages) =>
      trimToCompleteTurns(messages, state, estimator),
    );
  }

  // Call-local: every later call of the turn, including a recovery for an
  // empty or malformed response, starts again from the turn's messages.
  private retrimBeforeRetry(ctx: BeforeModelCallContext): void {
    const state = budgetState(ctx.context);
    if (state.reduction === state.appliedReduction) return;
    const estimator = budgetEstimator(ctx.model.tokens);
    ctx.transformMessages((messages) =>
      trimToCompleteTurns(messages, state, estimator),
    );
  }

  private tightenAfterRejection(
    ctx: AfterModelCallContext,
    model: BudgetModel,
  ): void {
    const failure = contextLengthRejection(ctx.outcome);
    if (!failure) return;
    const state = budgetState(ctx.context);
    const contextWindowTokens = getContextWindowTokens(model.contextWindowSize);
    const step = getContextOverflowReductionTokens(
      contextWindowTokens,
      failure.contextOverflowTokens,
    );
    // The budget may have had slack above what was sent, so the next request
    // is capped below the rejected one, not below the budget: at least one
    // turn always goes.
    const sent = state.sentMessageTokens ?? state.turnBudget - state.reduction;
    state.rejectedMessageTokens = sent;
    state.reduction = Math.max(
      state.reduction + step,
      state.turnBudget - sent + step,
    );
    this.logger.warn(
      {
        modelCallId: ctx.modelCallId,
        contextWindowTokens,
        contextOverflowTokens: failure.contextOverflowTokens,
        messageBudgetTokens: state.turnBudget - state.reduction,
      },
      'Provider rejected the request as too long; trimming more history before the retry',
    );
  }

  // The provider's reported input tokens are the only true count. Logging the
  // estimate next to them per call is what lets the safety ratios be set from
  // production data instead of guessed.
  private compareWithProviderCount(
    ctx: AfterModelCallContext,
    model: BudgetModel,
  ): void {
    const estimated = budgetState(ctx.context).estimatedRequestTokens;
    const reported = reportedInputTokens(ctx);
    if (estimated === undefined || reported === undefined) return;
    this.logger.log(
      {
        modelCallId: ctx.modelCallId,
        provider: model.provider,
        model: model.name,
        exactTokenizer: budgetEstimator(ctx.model.tokens).exact,
        estimatedInputTokens: estimated,
        reportedInputTokens: reported,
        reportedToEstimatedRatio: Number((reported / estimated).toFixed(3)),
      },
      'Context budget estimate compared with provider input tokens',
    );
  }
}

function trimToCompleteTurns(
  messages: readonly Message[],
  state: ContextBudgetState,
  estimator: TokenEstimator,
): Message[] {
  const countTokens = (message: Message): number =>
    countMessageTokens(estimator, toMessageParts(message));
  let selection = selectCompleteTurns(messages, {
    maxTokens: state.turnBudget - state.reduction,
    countTokens,
  });
  if (
    selection.messages.length === 0 &&
    state.rejectedMessageTokens !== undefined
  ) {
    // The older turns together are smaller than the reduction, so dropping
    // all of them is the most the retry can do. It still has to be smaller
    // than the request the provider rejected.
    const latestTurn = selectCompleteTurns(messages, {
      maxTokens: state.turnBudget,
      maxTurns: 1,
      countTokens,
    });
    if (latestTurn.tokens < state.rejectedMessageTokens) selection = latestTurn;
  }
  if (selection.messages.length === 0) {
    throw contextBudgetExceeded();
  }
  state.sentMessageTokens = selection.tokens;
  state.estimatedRequestTokens = state.turnFixedTokens + selection.tokens;
  return selection.messages;
}

function budgetState(context: RunContext): ContextBudgetState {
  const existing = context.get<ContextBudgetState>(CONTEXT_BUDGET_STATE);
  if (existing) return existing;
  const state: ContextBudgetState = {
    turnBudget: 0,
    turnFixedTokens: 0,
    reduction: 0,
    appliedReduction: 0,
  };
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

function reportedInputTokens(ctx: AfterModelCallContext): number | undefined {
  const usage = ctx.outcome.usage;
  if (usage.inputTokens === undefined) return undefined;
  return (
    usage.inputTokens +
    (usage.cacheReadInputTokens ?? 0) +
    (usage.cacheWriteInputTokens ?? 0)
  );
}

function toMessageParts(message: Message): MessagePart[] {
  return message.content.map((content) =>
    content.type === 'image'
      ? { kind: 'image' }
      : { kind: 'text', text: extractRuntimeContentText(content) },
  );
}

function extractRuntimeContentText(content: MessageContent): string {
  switch (content.type) {
    case 'text':
      return content.text;
    case 'thinking':
      return content.thinking;
    case 'tool_use':
      return `${content.id} ${content.name} ${JSON.stringify(content.input)}`;
    case 'tool_result':
      return `${content.toolCallId} ${content.toolName} ${content.result}`;
    case 'image':
      return '';
  }
}

function contextBudgetExceeded(): AgentRuntimeError {
  return new AgentRuntimeError(
    'CONTEXT_BUDGET_EXCEEDED',
    'The latest conversation turn exceeds the model context budget',
  );
}
