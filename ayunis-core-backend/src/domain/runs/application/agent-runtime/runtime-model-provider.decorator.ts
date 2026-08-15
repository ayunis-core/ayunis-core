import { AgentRuntimeError, RunAbortedError } from '@ayunis/agent-runtime';
import type {
  Message,
  MessageContent,
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
  ToolSchema,
} from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { extractUpstreamStatus } from 'src/common/errors/extract-upstream-status.helper';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  isRetryableSetupFailure,
  SETUP_RETRY_BACKOFF_MS,
} from 'src/common/errors/provider-transport-error.classifier';
import {
  STREAM_IDLE_TIMEOUT_MS,
  StreamIdleWatchdog,
} from 'src/common/streaming/stream-idle-watchdog';
import {
  InferenceAbortedError,
  InferenceFailedError,
  InferenceImageTooLargeError,
  InferenceStreamStalledError,
  ModelErrorCode,
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

function backoff(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class RuntimeModelProviderDecorator {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(RuntimeModelProviderDecorator.name)
    private readonly logger: PinoLogger,
  ) {}

  decorate(
    provider: ModelProvider,
    context: RuntimeModelCallContext,
  ): ModelProvider {
    return {
      name: provider.name,
      stream: (request) => this.streamWithRetry(provider, request, context),
    };
  }

  /**
   * A failure before any visible content is safe to retry: nothing reached
   * the accumulator or the client, so a second attempt is indistinguishable
   * from a slow first one (usage chunks merge last-wins). After content, a
   * retry would duplicate what the user already watched arrive. Covers both
   * stalled streams (AYC-652) and transient transport failures raised before
   * the first chunk (AYC-653) — the latter get a short backoff first.
   */
  private async *streamWithRetry(
    provider: ModelProvider,
    request: ProviderRequest,
    context: RuntimeModelCallContext,
  ): AsyncIterable<ProviderChunk> {
    let streamedContent = false;
    try {
      for await (const chunk of this.stream(provider, request, context)) {
        streamedContent ||= isContentChunk(chunk);
        yield chunk;
      }
      return;
    } catch (error) {
      const reason = retryReason(error, streamedContent, request.signal);
      if (!reason) {
        throw error;
      }
      if (reason === 'transient transport failure') {
        await backoff(SETUP_RETRY_BACKOFF_MS);
        // Recheck after the wait — a cancellation during the backoff must
        // not start a second attempt either.
        if (request.signal?.aborted) {
          throw error;
        }
      }
      this.logger.warn(
        { model: context.model.name, reason },
        'Provider stream failed before producing output; retrying once',
      );
    }
    yield* this.stream(provider, request, context);
  }

  private async *stream(
    provider: ModelProvider,
    request: ProviderRequest,
    context: RuntimeModelCallContext,
  ): AsyncIterable<ProviderChunk> {
    const startedAt = Date.now();
    const state = createCallState(request.signal);
    let mappedError: ApplicationError | undefined;
    try {
      const sanitizedRequest = sanitizeReplayedToolInputs(request);
      for await (const chunk of provider.stream({
        ...sanitizedRequest,
        signal: state.controller.signal,
      })) {
        state.watchdog.notifyChunk();
        yield chunk;
      }
    } catch (error) {
      mappedError = mapProviderError(error, request, state.controller, context);
      if (
        mappedError instanceof InferenceAbortedError &&
        request.signal?.aborted
      ) {
        throw new RunAbortedError('Run aborted during model call');
      }
      throw toRuntimeError(mappedError, error);
    } finally {
      state.watchdog.stop();
      state.stopRelayingAbort();
      if (!mappedError && request.signal?.aborted) {
        mappedError = new InferenceAbortedError();
      }
      this.emitCompletion(context, startedAt, mappedError);
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
          'agent_runtime',
          error ? extractInferenceErrorInfo(error) : undefined,
        ),
      )
      .catch((emitError: unknown) => {
        this.logger.error(
          {
            error:
              emitError instanceof Error ? emitError.message : 'Unknown error',
          },
          'Failed to emit InferenceCompletedEvent',
        );
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
  const watchdog = new StreamIdleWatchdog(STREAM_IDLE_TIMEOUT_MS, () => {
    controller.abort(new InferenceStreamStalledError(STREAM_IDLE_TIMEOUT_MS));
  });
  return { controller, watchdog, stopRelayingAbort };
}

function relayAbort(
  source: AbortSignal | undefined,
  target: AbortController,
): () => void {
  if (!source) return () => undefined;
  const abort = () => target.abort(source.reason);
  if (source.aborted) {
    abort();
    return () => undefined;
  }
  source.addEventListener('abort', abort, { once: true });
  return () => source.removeEventListener('abort', abort);
}

function mapProviderError(
  error: unknown,
  request: ProviderRequest,
  controller: AbortController,
  context: RuntimeModelCallContext,
): ApplicationError {
  const abortReason: unknown = controller.signal.reason;
  if (abortReason instanceof InferenceStreamStalledError) return abortReason;
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
    details: serializeRuntimeModelError(mappedError, STREAM_IDLE_TIMEOUT_MS),
    cause,
  });
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === 'AbortError'
  );
}

function isContentChunk(chunk: ProviderChunk): boolean {
  return Boolean(
    chunk.textDelta ||
    chunk.thinkingDelta ||
    (chunk.toolCallDeltas && chunk.toolCallDeltas.length > 0),
  );
}

function isStalledStreamError(error: unknown): boolean {
  // The runtime boundary serializes classified errors, so only the plain
  // string code survives on AgentRuntimeError.
  const stalledCode: string = ModelErrorCode.INFERENCE_TIMEOUT;
  return error instanceof AgentRuntimeError && error.code === stalledCode;
}

/**
 * `stream()` wraps provider failures into AgentRuntimeError before they reach
 * the retry layer; the raw transport error the classifier understands rides
 * on `cause`.
 */
function isTransientSetupError(error: unknown): boolean {
  return (
    error instanceof AgentRuntimeError && isRetryableSetupFailure(error.cause)
  );
}

function retryReason(
  error: unknown,
  streamedContent: boolean,
  signal: AbortSignal | undefined,
): 'stall' | 'transient transport failure' | null {
  if (streamedContent || signal?.aborted) return null;
  if (isStalledStreamError(error)) return 'stall';
  if (isTransientSetupError(error)) return 'transient transport failure';
  return null;
}
