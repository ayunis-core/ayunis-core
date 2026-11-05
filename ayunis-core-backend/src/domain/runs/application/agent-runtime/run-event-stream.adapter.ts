import type { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { RunEvent, ToolCallSnapshot } from '@ayunis/agent-runtime';
import { DEFAULT_MAX_ITERATIONS } from '@ayunis/agent-runtime';
import { ApplicationError } from 'src/common/errors/base.error';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
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
import {
  reconstructRuntimeAnonymizationError,
  reconstructRuntimeModelError,
} from './runtime-model-error';
import type { RuntimeModelRegistry } from './runtime-model.registry';
import {
  mapPortableProviderError,
  mapProviderFailureBehindHook,
} from './provider-failure.mapper';
import { mapMalformedToolCallError } from './malformed-tool-call-error.helper';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';
import { mapRuntimeHookError } from './runtime-hook-error';
import { mapCreditPolicyError } from 'src/domain/runs/application/credit-policy-error';
import { mapUsageAccountingError } from './usage-accounting-error.mapper';
import { SNAPSHOT_DUE, SnapshotThrottle } from './snapshot-throttle';

interface StreamingTurn {
  id: UUID;
  text: string;
  thinking: string;
  toolCalls: Map<number, ToolCallSnapshot>;
}

export interface RunEventStreamOptions {
  integrations?: RuntimeToolIntegrationRegistry;
  models?: RuntimeModelRegistry;
  throttle?: SnapshotThrottle;
}

/** Delays mapped errors until runtime terminal hooks have completed. */
export async function* adaptRunEventsToStream(
  events: AsyncIterable<RunEvent>,
  threadId: UUID,
  logger: Logger,
  { throttle = new SnapshotThrottle(), ...options }: RunEventStreamOptions = {},
): AsyncGenerator<RunStreamItem, RunExecutionOutcome, void> {
  const translator = new RunEventTranslator(
    threadId,
    logger,
    throttle,
    options,
  );
  try {
    for await (const item of throttle.pace(events, () =>
      translator.hasUnsentSnapshot(),
    )) {
      yield* translator.translate(item);
    }
  } catch (error) {
    yield* translator.sendSnapshot();
    throw error;
  }
  yield* translator.sendSnapshot();
  return translator.finish();
}

/**
 * Streaming deltas only update the turn; its snapshot is sent at most once
 * per throttle interval and always before any other item, so the client never
 * misses the latest state.
 */
class RunEventTranslator {
  private readonly assistant: AssistantTurnAccumulator;
  private pendingError: ApplicationError | null = null;
  private outcome: RunExecutionOutcome | undefined;

  constructor(
    private readonly threadId: UUID,
    private readonly logger: Logger,
    private readonly throttle: SnapshotThrottle,
    private readonly options: Omit<RunEventStreamOptions, 'throttle'>,
  ) {
    this.assistant = new AssistantTurnAccumulator(
      threadId,
      options.integrations,
    );
  }

  hasUnsentSnapshot(): boolean {
    return this.assistant.hasUnsentSnapshot();
  }

  *translate(item: RunEvent | typeof SNAPSHOT_DUE): Generator<RunStreamItem> {
    if (item === SNAPSHOT_DUE) {
      yield* this.sendSnapshot();
      return;
    }
    if (this.assistant.accumulate(item)) {
      if (this.throttle.isDue()) yield* this.sendSnapshot();
      return;
    }
    yield* this.sendSnapshot();
    this.outcome = readOutcome(item) ?? this.outcome;
    const translated =
      this.assistant.complete(item) ??
      toSideStreamItem(
        item,
        this.threadId,
        this.assistant.lastCompletedIteration(),
        this.logger,
        this.options.models,
      );
    if (translated instanceof ApplicationError) {
      this.pendingError = translated;
    } else if (translated) {
      yield translated;
    }
  }

  *sendSnapshot(): Generator<AssistantMessage> {
    const snapshot = this.assistant.takeUnsentSnapshot();
    if (!snapshot) return;
    this.throttle.markSent();
    yield snapshot;
  }

  finish(): RunExecutionOutcome {
    if (this.pendingError) {
      throw this.pendingError;
    }
    if (!this.outcome) {
      throw new RunExecutionFailedError(
        'Agent runtime ended without a terminal outcome',
      );
    }
    return this.outcome;
  }
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
  private unsent = false;

  constructor(
    private readonly threadId: UUID,
    private readonly integrations?: RuntimeToolIntegrationRegistry,
  ) {}

  /** Folds a streaming event into the turn; false for any other event. */
  accumulate(event: RunEvent): boolean {
    if (event.type === 'thinking_delta') {
      this.ensureTurn(event.runId).thinking += event.delta;
    } else if (event.type === 'text_delta') {
      this.ensureTurn(event.runId).text += event.delta;
    } else if (event.type === 'tool_call_snapshot') {
      const turn = this.ensureTurn(event.runId);
      turn.toolCalls.set(event.toolCall.index, event.toolCall);
    } else {
      return false;
    }
    this.unsent = true;
    return true;
  }

  hasUnsentSnapshot(): boolean {
    return this.unsent;
  }

  takeUnsentSnapshot(): AssistantMessage | null {
    if (!this.unsent || !this.turn) return null;
    this.unsent = false;
    return buildStreamingMessage(this.turn, this.threadId, this.integrations);
  }

  complete(event: RunEvent): AssistantMessage | null {
    if (event.type !== 'assistant_message') return null;
    const id = this.turn?.id ?? assistantMessageId(event.runId, this.turnIndex);
    const message = toBackendAssistantMessage(
      event.message,
      this.threadId,
      id,
      this.integrations,
    );
    appendInvalidToolCalls(message, this.turn, this.integrations);
    this.turn = null;
    this.unsent = false;
    this.turnIndex++;
    return message;
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

function mapRunError(
  event: RunErrorEvent,
  logger: Logger,
  models?: RuntimeModelRegistry,
): ApplicationError {
  if (event.code === 'ANONYMIZATION_UNAVAILABLE') {
    return new RunAnonymizationUnavailableError(
      undefined,
      reconstructRuntimeAnonymizationError(event.details),
    );
  }
  const policyError = mapCreditPolicyError(event);
  if (policyError) return policyError;
  const accountingError = mapUsageAccountingError(event, logger);
  if (accountingError) {
    const providerError = mapProviderFailureBehindHook(event, models);
    if (!providerError) return accountingError;
    // The accounting failure is what made the call terminal; the transcript
    // policy reads it from here.
    providerError.cause = accountingError;
    return providerError;
  }
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
  const malformedToolCall = mapMalformedToolCallError(event, models);
  if (malformedToolCall) return malformedToolCall;
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
  return new RunExecutionFailedError('Agent runtime failed', {
    runtimeErrorCode: event.code,
  });
}
