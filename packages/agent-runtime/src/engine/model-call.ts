import { ProviderError, RunAbortedError } from '../contracts/errors';
import type { RunEventPayload } from '../contracts/event';
import type { ToolCallSnapshot } from '../contracts/event';
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
export async function* streamModelCall(params: {
  model: ModelProvider;
  request: ProviderRequest;
}): AsyncGenerator<RunEventPayload, ModelCallResult> {
  const accumulator = new ChunkAccumulator();
  const stream = openStream(params.model, params.request);
  try {
    for await (const chunk of stream) {
      const toolCallSnapshots = accumulator.accept(chunk);
      yield* deltaEvents(chunk, toolCallSnapshots);
      if (params.request.signal?.aborted) {
        throw new RunAbortedError('Run aborted during model call');
      }
    }
  } catch (error) {
    if (error instanceof RunAbortedError) {
      throw error;
    }
    throw toProviderError(error);
  }
  const result = accumulator.finalize();
  for (const toolCall of result.invalidToolCallSnapshots) {
    yield { type: 'tool_call_snapshot', toolCall };
  }
  return result;
}

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

const toProviderError = (error: unknown): ProviderError => {
  if (error instanceof ProviderError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : 'Model provider failed';
  return new ProviderError(message, error);
};
