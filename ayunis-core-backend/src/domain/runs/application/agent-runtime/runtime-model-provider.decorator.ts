import { AgentRuntimeError, RunAbortedError } from '@ayunis/agent-runtime';
import type {
  Message,
  MessageContent,
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
  ToolSchema,
} from '@ayunis/inference';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { extractUpstreamStatus } from 'src/common/errors/extract-upstream-status.helper';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  STREAM_FIRST_CHUNK_TIMEOUT_MS,
  STREAM_IDLE_TIMEOUT_MS,
  StreamIdleWatchdog,
} from 'src/common/streaming/stream-idle-watchdog';
import { relayAbort } from 'src/common/streaming/relay-abort';
import {
  InferenceAbortedError,
  InferenceFailedError,
  InferenceImageTooLargeError,
  InferenceStreamStalledError,
} from 'src/domain/models/application/models.errors';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { InferenceCompletedEvent } from '../events/inference-completed.event';
import { extractInferenceErrorInfo } from '../helpers/extract-inference-error-info.helper';
import { serializeRuntimeModelError } from './runtime-model-error';

interface RuntimeModelCallContext {
  readonly userId: UUID;
  readonly orgId: UUID;
  readonly model: LanguageModel;
}

interface CallState {
  readonly controller: AbortController;
  readonly watchdog: StreamIdleWatchdog;
  readonly stopRelayingAbort: () => void;
}

/**
 * One retry, and only when the stalled attempt yielded nothing: once a chunk
 * has reached the runtime accumulator a second attempt would duplicate
 * content.
 */
const MAX_STREAM_ATTEMPTS = 2;

interface StreamAttemptOutcome {
  stalled?: InferenceStreamStalledError;
  chunksYielded: number;
}

@Injectable()
export class RuntimeModelProviderDecorator {
  private readonly logger = new Logger(RuntimeModelProviderDecorator.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  decorate(
    provider: ModelProvider,
    context: RuntimeModelCallContext,
  ): ModelProvider {
    return {
      name: provider.name,
      stream: (request) => this.stream(provider, request, context),
    };
  }

  private async *stream(
    provider: ModelProvider,
    request: ProviderRequest,
    context: RuntimeModelCallContext,
  ): AsyncIterable<ProviderChunk> {
    const startedAt = Date.now();
    let mappedError: ApplicationError | undefined;
    try {
      const sanitizedRequest = sanitizeReplayedToolInputs(request);
      yield* this.streamWithStallRetry(provider, sanitizedRequest, context);
    } catch (error) {
      mappedError = mapProviderError(error, request, context);
      if (
        mappedError instanceof InferenceAbortedError &&
        request.signal?.aborted
      ) {
        throw new RunAbortedError('Run aborted during model call');
      }
      throw toRuntimeError(mappedError, error);
    } finally {
      if (!mappedError && request.signal?.aborted) {
        mappedError = new InferenceAbortedError();
      }
      this.emitCompletion(context, startedAt, mappedError);
    }
  }

  private async *streamWithStallRetry(
    provider: ModelProvider,
    request: ProviderRequest,
    context: RuntimeModelCallContext,
  ): AsyncGenerator<ProviderChunk, void> {
    for (let attempt = 1; ; attempt++) {
      const outcome = yield* streamAttempt(provider, request);
      if (!outcome.stalled) {
        return;
      }
      // No retry once the caller has cancelled — the run is gone, so a
      // second attempt would only bill tokens nobody reads.
      if (
        outcome.chunksYielded > 0 ||
        attempt >= MAX_STREAM_ATTEMPTS ||
        request.signal?.aborted === true
      ) {
        throw outcome.stalled;
      }
      this.logger.warn('Provider stream stalled before the first chunk', {
        model: context.model.name,
        provider: context.model.provider,
        attempt,
      });
    }
  }

  private emitCompletion(
    context: RuntimeModelCallContext,
    startedAt: number,
    error: ApplicationError | undefined,
  ): void {
    this.eventEmitter
      .emitAsync(
        InferenceCompletedEvent.EVENT_NAME,
        new InferenceCompletedEvent(
          context.userId,
          context.orgId,
          context.model.name,
          context.model.provider,
          true,
          Date.now() - startedAt,
          error ? extractInferenceErrorInfo(error) : undefined,
        ),
      )
      .catch((emitError: unknown) => {
        this.logger.error('Failed to emit InferenceCompletedEvent', {
          error:
            emitError instanceof Error ? emitError.message : 'Unknown error',
        });
      });
  }
}

function sanitizeReplayedToolInputs(request: ProviderRequest): ProviderRequest {
  const parametersByName = new Map<string, ToolSchema['parameters']>(
    request.tools.map((tool) => [tool.name, tool.parameters]),
  );
  const messages = request.messages.map((message) =>
    sanitizeAssistantToolInputs(message, parametersByName),
  );
  return messages.every((message, index) => message === request.messages[index])
    ? request
    : { ...request, messages };
}

function sanitizeAssistantToolInputs(
  message: Message,
  parametersByName: ReadonlyMap<string, ToolSchema['parameters']>,
): Message {
  if (message.role !== 'assistant') return message;
  const content = message.content.map((item) =>
    sanitizeToolInput(item, parametersByName),
  );
  return content.every((item, index) => item === message.content[index])
    ? message
    : { ...message, content };
}

function sanitizeToolInput(
  content: MessageContent,
  parametersByName: ReadonlyMap<string, ToolSchema['parameters']>,
): MessageContent {
  if (content.type !== 'tool_use') return content;
  const parameters = parametersByName.get(content.name);
  if (!parameters) return content;
  const input = stripDisallowedNulls(content.input, parameters);
  return input === content.input ? content : { ...content, input };
}

function createCallState(sourceSignal: AbortSignal | undefined): CallState {
  const controller = new AbortController();
  const stopRelayingAbort = relayAbort(sourceSignal, controller);
  const watchdog = new StreamIdleWatchdog(
    STREAM_IDLE_TIMEOUT_MS,
    (elapsedMs) => {
      controller.abort(new InferenceStreamStalledError(elapsedMs));
    },
  );
  return { controller, watchdog, stopRelayingAbort };
}

/**
 * One provider attempt on its own controller. A stall is returned rather
 * than thrown because SDKs disagree on what an abort looks like: some reject
 * with a generic AbortError, the stainless SDKs (openai, anthropic) swallow
 * it and end the stream as if it completed — which would otherwise let the
 * runtime accumulate a silently truncated turn as a success.
 */
async function* streamAttempt(
  provider: ModelProvider,
  request: ProviderRequest,
): AsyncGenerator<ProviderChunk, StreamAttemptOutcome> {
  const state = createCallState(request.signal);
  let chunksYielded = 0;
  try {
    state.watchdog.arm(STREAM_FIRST_CHUNK_TIMEOUT_MS);
    for await (const chunk of provider.stream({
      ...request,
      signal: state.controller.signal,
    })) {
      state.watchdog.notifyChunk();
      chunksYielded += 1;
      yield chunk;
    }
    return { stalled: stalledReason(state.controller.signal), chunksYielded };
  } catch (error) {
    const stalled = stalledReason(state.controller.signal);
    if (stalled) {
      return { stalled, chunksYielded };
    }
    throw error;
  } finally {
    state.watchdog.stop();
    state.stopRelayingAbort();
  }
}

function stalledReason(
  signal: AbortSignal,
): InferenceStreamStalledError | undefined {
  return signal.aborted && signal.reason instanceof InferenceStreamStalledError
    ? signal.reason
    : undefined;
}

function mapProviderError(
  error: unknown,
  request: ProviderRequest,
  context: RuntimeModelCallContext,
): ApplicationError {
  if (request.signal?.aborted && error === request.signal.reason) {
    return new InferenceAbortedError();
  }
  if (error instanceof ApplicationError) return error;
  const providerError = wrapProviderFailure(error, {
    provider: context.model.provider,
    modelId: context.model.name,
  });
  if (providerError) return providerError;
  return mapUnclassifiedProviderError(error, request);
}

function mapUnclassifiedProviderError(
  error: unknown,
  request: ProviderRequest,
): ApplicationError {
  const status = extractUpstreamStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  if (/image exceeds .* maximum/i.test(message)) {
    return new InferenceImageTooLargeError({ status });
  }
  if (request.signal?.aborted || isAbortError(error)) {
    return new InferenceAbortedError();
  }
  return new InferenceFailedError('Provider inference failed', { status });
}

function toRuntimeError(
  mappedError: ApplicationError,
  cause: unknown,
): AgentRuntimeError {
  return new AgentRuntimeError(mappedError.code, mappedError.message, {
    details: serializeRuntimeModelError(mappedError),
    cause,
  });
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === 'AbortError'
  );
}
