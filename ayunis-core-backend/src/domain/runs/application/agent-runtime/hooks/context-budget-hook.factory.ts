import {
  AgentRuntimeError,
  estimatedTokens,
  type AfterModelCallContext,
  type BeforeModelTurnContext,
  type Hook,
  type Message,
  type MessageContent,
  type TokenEstimator,
} from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import {
  getContextWindowTokens,
  getMessageBudgetTokens,
  getTokenizerSafetyRatio,
} from 'src/common/token-counter/application/context-budget.constants';
import { selectCompleteTurns } from 'src/domain/runs/application/agent-runtime/complete-turn-selector';

export interface BudgetModel {
  readonly provider: string;
  readonly name: string;
  readonly contextWindowSize?: number;
}

export interface MessageBudgetParams {
  instructions: string;
  tools: readonly {
    name: string;
    description: string;
    parameters: unknown;
  }[];
  model: BudgetModel;
  /** The provider's own estimator; the shared estimate applies without one. */
  tokens?: TokenEstimator;
}

interface ContextBudgetHookParams {
  model: BudgetModel;
}

/** Per-run RunContext key for the estimate of the request the hook last trimmed for. */
const ESTIMATED_REQUEST_TOKENS = Symbol('ayunis:estimatedRequestTokens');

@Injectable()
export class ContextBudgetHookFactory {
  private readonly logger = new Logger(ContextBudgetHookFactory.name);

  create(params: ContextBudgetHookParams): Hook {
    return {
      name: 'ayunis-context-budget',
      inheritToChildRuns: false,
      beforeModelTurn: (ctx) => this.trimTurn(ctx, params.model),
      afterModelCall: (ctx) => this.compareWithProviderCount(ctx, params.model),
    };
  }

  /** The history budget of one model call, shared with the history materializer. */
  messageBudgetTokens(params: MessageBudgetParams): number {
    const estimator = params.tokens ?? estimatedTokens();
    return getMessageBudgetTokens(
      getContextWindowTokens(params.model.contextWindowSize),
      countRequestTokens(params, estimator),
      getTokenizerSafetyRatio(estimator.exact),
    );
  }

  private trimTurn(ctx: BeforeModelTurnContext, model: BudgetModel): void {
    const estimator = ctx.model.tokens ?? estimatedTokens();
    const fixedTokens = countRequestTokens(
      { instructions: ctx.instructions, tools: ctx.tools, model },
      estimator,
    );
    const budget = getMessageBudgetTokens(
      getContextWindowTokens(model.contextWindowSize),
      fixedTokens,
      getTokenizerSafetyRatio(estimator.exact),
    );
    ctx.transformMessages((messages) => {
      const selection = selectCompleteTurns(messages, {
        maxTokens: budget,
        countTokens: (message) => countMessageTokens(message, estimator),
      });
      if (selection.messages.length === 0) {
        throw contextBudgetExceeded();
      }
      ctx.context.set(ESTIMATED_REQUEST_TOKENS, fixedTokens + selection.tokens);
      return selection.messages;
    });
  }

  // The provider's reported input tokens are the only true count. Logging the
  // estimate next to them per call is what lets the safety ratios be set from
  // production data instead of guessed.
  private compareWithProviderCount(
    ctx: AfterModelCallContext,
    model: BudgetModel,
  ): void {
    const estimated = ctx.context.get<number>(ESTIMATED_REQUEST_TOKENS);
    const reported = reportedInputTokens(ctx);
    if (estimated === undefined || reported === undefined) return;
    this.logger.log(
      {
        modelCallId: ctx.modelCallId,
        provider: model.provider,
        model: model.name,
        exactTokenizer: (ctx.model.tokens ?? estimatedTokens()).exact,
        estimatedInputTokens: estimated,
        reportedInputTokens: reported,
        reportedToEstimatedRatio: Number((reported / estimated).toFixed(3)),
      },
      'Context budget estimate compared with provider input tokens',
    );
  }
}

function countRequestTokens(
  request: MessageBudgetParams,
  estimator: TokenEstimator,
): number {
  return (
    estimator.countText(request.instructions) +
    estimator.countTools(request.tools)
  );
}

export function countMessageTokens(
  message: Message,
  estimator: TokenEstimator,
): number {
  return message.content.reduce(
    (total, content) =>
      total +
      (content.type === 'image'
        ? estimator.tokensPerImage
        : estimator.countText(extractRuntimeContentText(content))),
    estimator.tokensPerMessage,
  );
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
