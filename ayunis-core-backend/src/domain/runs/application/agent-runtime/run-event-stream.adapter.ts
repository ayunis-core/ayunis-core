import type { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type {
  ProviderFailureFacts,
  RunEvent,
  ToolCallSnapshot,
} from '@ayunis/agent-runtime';
import { DEFAULT_MAX_ITERATIONS } from '@ayunis/agent-runtime';
import {
  ApplicationError,
  type ErrorMetadata,
} from 'src/common/errors/base.error';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
  type ProviderErrorContext,
} from 'src/common/errors/provider.errors';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from 'src/domain/runs/domain/run-pii-masks-update.entity';
import {
  RunAnonymizationUnavailableError,
  RunContextBudgetExceededError,
  RunExecutionFailedError,
  RunMaxIterationsReachedError,
  RunToolRepeatedlyFailingError,
} from 'src/domain/runs/application/runs.errors';
import { assistantMessageId, toolResultMessageId } from './message-id';
import {
  toBackendAssistantMessage,
  toBackendToolResultMessage,
} from './inference-message.mapper';
import { THREAD_PII_MASKS_EVENT } from './masks-event';
import type { RuntimeToolIntegrationRegistry } from './runtime-tool-integration.registry';
import { reconstructRuntimeModelError } from './runtime-model-error';
import {
  InferenceAbortedError,
  InferenceFailedError,
  InferenceImageTooLargeError,
  InferenceStreamStalledError,
} from 'src/domain/models/application/models.errors';
import type { RuntimeModelRegistry } from './runtime-model.registry';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';
import { mapRuntimeHookError } from './runtime-hook-error';
import { mapCreditPolicyError } from 'src/domain/runs/application/credit-policy-error';
import { mapUsageAccountingError } from './usage-accounting-error.mapper';

interface StreamingTurn {
  id: UUID;
  text: string;
  thinking: string;
  toolCalls: Map<number, ToolCallSnapshot>;
}

/** Delays mapped errors until runtime terminal hooks have completed. */
export async function* adaptRunEventsToStream(
  events: AsyncIterable<RunEvent>,
  threadId: UUID,
  logger: Logger,
  integrations?: RuntimeToolIntegrationRegistry,
  models?: RuntimeModelRegistry,
): AsyncGenerator<RunStreamItem, RunExecutionOutcome, void> {
  const assistant = new AssistantTurnAccumulator(threadId, integrations);
  let pendingError: ApplicationError | null = null;
  let outcome: RunExecutionOutcome | undefined;

  for await (const event of events) {
    outcome = readOutcome(event) ?? outcome;
    const streamed = assistant.consume(event);
    if (streamed) {
      yield streamed;
      continue;
    }
    const side = toSideStreamItem(
      event,
      threadId,
      assistant.lastCompletedIteration(),
      logger,
      models,
    );
    if (side instanceof ApplicationError) {
      pendingError = side;
    } else if (side) {
      yield side;
    }
  }

  if (pendingError) {
    throw pendingError;
  }
  if (!outcome) {
    throw new RunExecutionFailedError(
      'Agent runtime ended without a terminal outcome',
    );
  }
  return outcome;
}

function readOutcome(event: RunEvent): RunExecutionOutcome | undefined {
  if (event.type !== 'run_end') return undefined;
  return event.status === 'completed' || event.status === 'aborted'
    ? event.status
    : undefined;
}

class AssistantTurnAccumulator {
  private turn: StreamingTurn | null = null;
  private turnIndex = 0;

  constructor(
    private readonly threadId: UUID,
    private readonly integrations?: RuntimeToolIntegrationRegistry,
  ) {}

  consume(event: RunEvent): AssistantMessage | null {
    if (event.type === 'thinking_delta') {
      const turn = this.ensureTurn(event.runId);
      turn.thinking += event.delta;
      return buildStreamingMessage(turn, this.threadId, this.integrations);
    }
    if (event.type === 'text_delta') {
      const turn = this.ensureTurn(event.runId);
      turn.text += event.delta;
      return buildStreamingMessage(turn, this.threadId, this.integrations);
    }
    if (event.type === 'tool_call_snapshot') {
      const turn = this.ensureTurn(event.runId);
      turn.toolCalls.set(event.toolCall.index, event.toolCall);
      return buildStreamingMessage(turn, this.threadId, this.integrations);
    }
    if (event.type === 'assistant_message') {
      const id =
        this.turn?.id ?? assistantMessageId(event.runId, this.turnIndex);
      const message = toBackendAssistantMessage(
        event.message,
        this.threadId,
        id,
        this.integrations,
      );
      appendInvalidToolCalls(message, this.turn, this.integrations);
      this.turn = null;
      this.turnIndex++;
      return message;
    }
    return null;
  }

  private ensureTurn(runId: string): StreamingTurn {
    this.turn ??= {
      id: assistantMessageId(runId, this.turnIndex),
      text: '',
      thinking: '',
      toolCalls: new Map(),
    };
    return this.turn;
  }

  /** Tool results follow the assistant turn after its index has advanced. */
  lastCompletedIteration(): number {
    return Math.max(0, this.turnIndex - 1);
  }
}

function toSideStreamItem(
  event: RunEvent,
  threadId: UUID,
  iteration: number,
  logger: Logger,
  models?: RuntimeModelRegistry,
): RunStreamItem | ApplicationError | null {
  if (event.type === 'tool_result_message') {
    return toBackendToolResultMessage(
      event.message,
      threadId,
      toolResultMessageId(event.runId, iteration),
    );
  }
  if (event.type === 'custom') {
    return event.name === THREAD_PII_MASKS_EVENT
      ? new RunPiiMasksUpdate(event.data as ThreadPiiMask[])
      : null;
  }
  if (event.type === 'error') {
    return mapRunError(event, logger, models);
  }
  if (event.type === 'finalization_error') {
    return mapFinalizationError(event, logger);
  }
  return null;
}

function mapFinalizationError(
  event: Extract<RunEvent, { type: 'finalization_error' }>,
  logger: Logger,
): ApplicationError | null {
  const context = {
    execution_path: 'agent_runtime',
    hookName: event.hookName,
    phase: 'runEnd',
    originalOutcome: event.outcome,
    critical: event.critical,
    message: event.message,
  };
  if (!event.critical) {
    logger.warn(context, 'Best-effort agent runtime finalization hook failed');
    return null;
  }
  logger.error(context, 'Critical agent runtime finalization hook failed');
  return new RunExecutionFailedError('Agent runtime finalization failed', {
    hookName: event.hookName,
    phase: 'runEnd',
    originalOutcome: event.outcome,
  });
}

function buildStreamingMessage(
  turn: StreamingTurn,
  threadId: UUID,
  integrations?: RuntimeToolIntegrationRegistry,
): AssistantMessage {
  const content: Array<
    TextMessageContent | ThinkingMessageContent | ToolUseMessageContent
  > = [];
  if (turn.thinking) {
    content.push(new ThinkingMessageContent(turn.thinking));
  }
  if (turn.text) {
    content.push(new TextMessageContent(turn.text));
  }
  for (const [, call] of [...turn.toolCalls].sort(([a], [b]) => a - b)) {
    content.push(toStreamingToolUseContent(call, integrations));
  }
  return new AssistantMessage({ id: turn.id, threadId, content });
}

function appendInvalidToolCalls(
  message: AssistantMessage,
  turn: StreamingTurn | null,
  integrations?: RuntimeToolIntegrationRegistry,
): void {
  if (!turn) return;
  const invalidCalls = [...turn.toolCalls.values()]
    .filter((call) => call.status === 'invalid')
    .map((call) => toStreamingToolUseContent(call, integrations));
  message.content.push(...invalidCalls);
}

function toStreamingToolUseContent(
  snapshot: ToolCallSnapshot,
  integrations?: RuntimeToolIntegrationRegistry,
): ToolUseMessageContent {
  const id = snapshot.id?.trim() || `tool-call-${snapshot.index}`;
  const name = snapshot.name?.trim() ?? '';
  return new ToolUseMessageContent(
    id,
    name,
    snapshot.input ?? {},
    snapshot.providerMetadata ?? null,
    integrations?.get(name),
    {
      status: snapshot.status,
      argumentsJson: snapshot.argumentsJson,
    },
  );
}

type RunErrorEvent = Extract<RunEvent, { type: 'error' }>;

const RUN_ERROR_MAPPERS = new Map<
  string,
  (event: RunErrorEvent) => ApplicationError
>([
  [
    'MAX_ITERATIONS_REACHED',
    (event) => {
      const max = event.details?.maxIterations;
      return new RunMaxIterationsReachedError(
        typeof max === 'number' ? max : DEFAULT_MAX_ITERATIONS,
      );
    },
  ],
  [
    'MALFORMED_TOOL_CALL',
    (event) =>
      new InferenceFailedError(
        'model emitted a tool call whose arguments did not arrive intact',
        event.details,
      ),
  ],
  [
    'TOOL_REPEATEDLY_FAILING',
    (event) => {
      const toolName = event.details?.toolName;
      const failureCount = event.details?.failureCount;
      return new RunToolRepeatedlyFailingError(
        typeof toolName === 'string' ? toolName : 'unknown',
        typeof failureCount === 'number' ? failureCount : 0,
      );
    },
  ],
  ['CONTEXT_BUDGET_EXCEEDED', () => new RunContextBudgetExceededError()],
]);

function mapPortableProviderError(
  event: RunErrorEvent,
  models: RuntimeModelRegistry | undefined,
): ApplicationError | undefined {
  if (
    event.code !== 'PROVIDER_FAILED' ||
    !event.providerFailure ||
    !event.modelCall ||
    !models
  ) {
    return undefined;
  }
  let model: LanguageModel;
  try {
    model = models.resolveByProviderName(event.modelCall.provider);
  } catch {
    return undefined;
  }
  const failure = event.providerFailure;
  const context = providerErrorContext(model.provider, model.name, failure);
  if (isRuntimeIdleStall(event, failure)) {
    return new InferenceStreamStalledError(
      readIdleMs(event.message),
      providerFailureMetadata(failure, context),
    );
  }
  if (isOversizedImageError(models.getCallError(event.modelCall.modelCallId))) {
    return new InferenceImageTooLargeError({
      provider: context.provider,
      modelId: context.modelId,
      status: failure.upstreamStatus,
      upstreamRequestId: failure.upstreamRequestId,
    });
  }
  return mapProviderFailure(failure, context);
}

function mapProviderFailure(
  failure: ProviderFailureFacts,
  context: ProviderErrorContext,
): ApplicationError {
  if (failure.kind === 'connection') {
    return new ProviderConnectionError(context);
  }
  if (failure.kind === 'timeout') return new ProviderTimeoutError(context);
  if (failure.kind === 'server') return new ProviderServerError(context);
  if (failure.kind === 'rate_limit') {
    return new ProviderRequestRejectedError(context);
  }
  if (failure.kind === 'abort') {
    return new InferenceAbortedError(providerFailureMetadata(failure, context));
  }
  return new InferenceFailedError(
    'Provider inference failed',
    providerFailureMetadata(failure, context),
  );
}

function providerErrorContext(
  provider: string,
  modelId: string,
  failure: ProviderFailureFacts,
): ProviderErrorContext {
  return {
    provider,
    modelId,
    failureStage: failure.stage,
    ...(failure.timeoutSource && { timeoutSource: failure.timeoutSource }),
    ...(failure.upstreamStatus !== undefined && {
      upstreamStatus: failure.upstreamStatus,
    }),
    ...(failure.upstreamRequestId && {
      upstreamRequestId: failure.upstreamRequestId,
    }),
    ...(failure.retryAfterMs !== undefined && {
      retryAfterMs: failure.retryAfterMs,
    }),
    ...(failure.transportCode && {
      underlyingCode: failure.transportCode,
    }),
    ...(failure.host && { host: failure.host }),
  };
}

function providerFailureMetadata(
  failure: ProviderFailureFacts,
  context: ProviderErrorContext,
): ErrorMetadata {
  return {
    provider: context.provider,
    modelId: context.modelId,
    failureStage: failure.stage,
    ...(failure.upstreamStatus !== undefined && {
      status: failure.upstreamStatus,
    }),
    ...(failure.upstreamRequestId && {
      upstreamRequestId: failure.upstreamRequestId,
    }),
    ...(failure.retryAfterMs !== undefined && {
      retryAfterMs: failure.retryAfterMs,
    }),
    ...(failure.timeoutSource && { timeoutSource: failure.timeoutSource }),
    ...(failure.transportCode && {
      underlyingCode: failure.transportCode,
    }),
    ...(failure.host && { host: failure.host }),
  };
}

const RUNTIME_IDLE_PREFIX = 'Model provider stream was idle for ';
const MILLISECONDS_SUFFIX = 'ms';

function isRuntimeIdleStall(
  event: RunErrorEvent,
  failure: ProviderFailureFacts,
): boolean {
  return (
    failure.kind === 'timeout' &&
    event.message.startsWith(RUNTIME_IDLE_PREFIX) &&
    event.message.endsWith(MILLISECONDS_SUFFIX) &&
    Number.isFinite(readIdleMs(event.message)) &&
    readIdleMs(event.message) > 0
  );
}

function readIdleMs(message: string): number {
  return Number(
    message.slice(RUNTIME_IDLE_PREFIX.length, -MILLISECONDS_SUFFIX.length),
  );
}

function isOversizedImageError(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 8; depth++) {
    if (current instanceof Error) {
      const message = current.message.toLowerCase();
      if (message.includes('image exceeds ') && message.includes(' maximum')) {
        return true;
      }
    }
    if (typeof current !== 'object' || current === null || seen.has(current)) {
      return false;
    }
    seen.add(current);
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function mapRunError(
  event: RunErrorEvent,
  logger: Logger,
  models?: RuntimeModelRegistry,
): ApplicationError {
  if (event.code === 'ANONYMIZATION_UNAVAILABLE') {
    return new RunAnonymizationUnavailableError(
      undefined,
      reconstructRuntimeModelError(event.details),
    );
  }
  const policyError =
    mapCreditPolicyError(event) ?? mapUsageAccountingError(event);
  if (policyError) return policyError;
  const hookFailure = mapRuntimeHookError(event, logger);
  if (hookFailure) return hookFailure;
  const runtimeModelError = reconstructRuntimeModelError(event.details);
  if (runtimeModelError instanceof ApplicationError) {
    return runtimeModelError;
  }
  const portableProviderError = mapPortableProviderError(event, models);
  if (portableProviderError) {
    return portableProviderError;
  }
  const mapper = RUN_ERROR_MAPPERS.get(event.code);
  if (mapper) {
    return mapper(event);
  }
  logger.error(
    {
      code: event.code,
      message: event.message,
      details: event.details,
    },
    'Agent runtime failed',
  );
  return new RunExecutionFailedError('Agent runtime failed');
}
