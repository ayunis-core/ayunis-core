import {
  AgentRuntimeError,
  MalformedToolCallError,
  ProviderError,
  RunAbortedError,
} from '../contracts/errors';
import type { RunEventPayload, ToolCallSnapshot } from '../contracts/event';
import type { ModelCallInterruptionReason } from '../contracts/hook';
import type { AssistantMessage } from '../contracts/message';
import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '../contracts/provider';
import type { ModelCallResult } from './accumulator';
import { ChunkAccumulator } from './accumulator';

/**
 * Performs one model call: streams chunks, yields delta events as they
 * arrive, and returns the assembled assistant message. Provider failures
 * are wrapped in ProviderError; an aborted signal throws RunAbortedError.
 */
interface ModelCallParams {
  model: ModelProvider;
  request: ProviderRequest;
  onInterrupted: (interruption: {
    message: AssistantMessage;
    reason: ModelCallInterruptionReason;
  }) => Promise<void>;
}

export async function* streamModelCall(
  params: ModelCallParams,
): AsyncGenerator<RunEventPayload, ModelCallResult> {
  const accumulator = new ChunkAccumulator();
  let completed = false;
  let result: ModelCallResult | null = null;
  let interruptionError: AgentRuntimeError | undefined;
  let interruptionReason: ModelCallInterruptionReason = 'consumer_abandoned';
  try {
    result = yield* collectModelCall(params, accumulator);
    assertToolCallsIntact(result);
    completed = true;
  } catch (error) {
    const interruption = classifyInterruption(error, params.request.signal);
    interruptionError = interruption.error;
    interruptionReason = interruption.reason;
    throw interruption.error;
  } finally {
    await notifyInterruptedPreservingOutcome(
      params,
      accumulator,
      completed,
      interruptionReason,
      interruptionError,
    );
  }
  return result;
}

async function* collectModelCall(
  params: ModelCallParams,
  accumulator: ChunkAccumulator,
): AsyncGenerator<RunEventPayload, ModelCallResult> {
  const stream = openStream(params.model, params.request);
  for await (const chunk of stream) {
    const toolCallSnapshots = accumulator.accept(chunk);
    yield* deltaEvents(chunk, toolCallSnapshots);
    if (params.request.signal?.aborted) {
      throw new RunAbortedError('Run aborted during model call');
    }
  }
  const result = accumulator.finalize();
  for (const toolCall of result.invalidToolCallSnapshots) {
    yield { type: 'tool_call_snapshot', toolCall };
  }
  return result;
}

/**
 * Rejects a completed model call whose tool-call arguments cannot be executed
 * faithfully. Truncated text answers stay acceptable — only tool calls must
 * arrive intact, because their input is acted upon (AYC-646).
 */
const assertToolCallsIntact = (result: ModelCallResult): void => {
  if (result.invalidToolCallSnapshots.length > 0) {
    throw new MalformedToolCallError(
      {
        toolNames: result.invalidToolCallSnapshots.map((call) => call.name),
        reason: 'unparseable_arguments',
      },
      { usage: result.usage },
    );
  }
  const toolNames = result.message.content
    .filter((content) => content.type === 'tool_use')
    .map((content) => content.name);
  if (result.finishReason === 'length' && toolNames.length > 0) {
    throw new MalformedToolCallError(
      {
        toolNames,
        reason: 'token_limit_reached',
      },
      { usage: result.usage },
    );
  }
};

const classifyInterruption = (
  error: unknown,
  signal?: AbortSignal,
): { error: AgentRuntimeError; reason: ModelCallInterruptionReason } => {
  if (error instanceof RunAbortedError) {
    return {
      error,
      reason: 'aborted',
    };
  }
  if (error instanceof AgentRuntimeError) {
    return { error, reason: 'error' };
  }
  if (signal?.aborted) {
    return {
      error: new RunAbortedError('Run aborted during model call'),
      reason: 'aborted',
    };
  }
  return { error: toProviderError(error), reason: 'error' };
};

const notifyInterrupted = async (
  params: Parameters<typeof streamModelCall>[0],
  accumulator: ChunkAccumulator,
  completed: boolean,
  reason: ModelCallInterruptionReason,
): Promise<void> => {
  if (completed) return;
  await params.onInterrupted({
    message: accumulator.partialMessage(),
    reason:
      reason === 'consumer_abandoned' && params.request.signal?.aborted
        ? 'aborted'
        : reason,
  });
};

const notifyInterruptedPreservingOutcome = async (
  params: Parameters<typeof streamModelCall>[0],
  accumulator: ChunkAccumulator,
  completed: boolean,
  reason: ModelCallInterruptionReason,
  interruptionError: AgentRuntimeError | undefined,
): Promise<void> => {
  try {
    await notifyInterrupted(params, accumulator, completed, reason);
  } catch (error) {
    if (!interruptionError) throw error;
  }
};

const openStream = (
  model: ModelProvider,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> => {
  try {
    return model.stream(request);
  } catch (error) {
    throw toProviderError(error);
  }
};

function* deltaEvents(
  chunk: ProviderChunk,
  toolCallSnapshots: readonly ToolCallSnapshot[],
): Generator<RunEventPayload> {
  if (chunk.thinkingDelta) {
    yield { type: 'thinking_delta', delta: chunk.thinkingDelta };
  }
  if (chunk.textDelta) {
    yield { type: 'text_delta', delta: chunk.textDelta };
  }
  for (const toolCall of toolCallSnapshots) {
    yield { type: 'tool_call_snapshot', toolCall };
  }
}

const toProviderError = (error: unknown): AgentRuntimeError => {
  if (error instanceof AgentRuntimeError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : 'Model provider failed';
  return new ProviderError(message, error);
};
