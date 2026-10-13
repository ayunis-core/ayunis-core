import {
  AgentRuntimeError,
  type AfterModelCallContext,
  type BeforeModelTurnContext,
  type Hook,
  type Message,
  type MessageContent,
} from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import {
  budgetEstimator,
  countMessageTokens,
  countRequestTokens,
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

  private trimTurn(ctx: BeforeModelTurnContext, model: BudgetModel): void {
    const estimator = budgetEstimator(ctx.model.tokens);
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
        countTokens: (message) =>
          countMessageTokens(estimator, toMessageParts(message)),
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
        exactTokenizer: budgetEstimator(ctx.model.tokens).exact,
        estimatedInputTokens: estimated,
        reportedInputTokens: reported,
        reportedToEstimatedRatio: Number((reported / estimated).toFixed(3)),
      },
      'Context budget estimate compared with provider input tokens',
    );
  }
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
