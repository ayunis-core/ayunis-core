import type { ModelProvider } from '@ayunis/inference';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Subscriber } from 'rxjs';
import { Observable } from 'rxjs';
import type {
  StreamInferenceAttemptTerminalContext,
  StreamInferenceAttemptUsage,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
} from 'src/domain/models/application/ports/stream-inference.handler';
import { StreamInferenceHandler } from 'src/domain/models/application/ports/stream-inference.handler';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type { Model } from 'src/domain/models/domain/model.entity';
import { toProviderRequest } from './request.mapper';
import { toStreamChunk } from './chunk.mapper';
import type { ChunkTransform } from './chunk-transform';
import { applyChunkTransform } from './chunk-transform';
import {
  StreamIdleWatchdog,
  STREAM_IDLE_TIMEOUT_MS,
} from 'src/common/streaming/stream-idle-watchdog';
import {
  isRetryableProviderRateLimitFailure,
  isRetryableProviderServerFailure,
  isRetryableProviderTimeoutFailure,
  isRetryableSetupFailure,
  rateLimitRetryDelayMs,
  SETUP_RETRY_BACKOFF_MS,
} from 'src/common/errors/provider-transport-error.classifier';
import { InferenceStreamStalledError } from 'src/domain/models/application/models.errors';

/**
 * Bounded retries, and only when the failed attempt emitted nothing: once a
 * chunk reaches the subscriber it may already be persisted downstream, so
 * another attempt would duplicate content.
 */
const MAX_SETUP_ATTEMPTS = 2;
const MAX_SERVER_ATTEMPTS = 3;

type ProviderStreamRequest = Parameters<ModelProvider['stream']>[0];
type AttemptOutcome = StreamInferenceAttemptTerminalContext['outcome'];

type StreamAttemptResult =
  | { readonly type: 'completed' }
  | {
      readonly type: 'failed';
      readonly error: unknown;
      readonly outputEmitted: boolean;
    };

interface StreamAttemptParams {
  input: StreamInferenceInput;
  provider: ModelProvider;
  request: ProviderStreamRequest;
  subscriber: Subscriber<StreamInferenceResponseChunk>;
  controller: AbortController;
  watchdog: StreamIdleWatchdog;
}

interface RetryableStreamFailure {
  readonly error: Error;
  readonly maxAttempts: number;
  readonly reason: 'transport' | 'timeout' | 'server' | 'rate_limit';
}

function retryableStreamFailure(error: Error): RetryableStreamFailure | null {
  if (isRetryableSetupFailure(error)) {
    return { error, maxAttempts: MAX_SETUP_ATTEMPTS, reason: 'transport' };
  }
  if (isRetryableProviderTimeoutFailure(error)) {
    return { error, maxAttempts: MAX_SETUP_ATTEMPTS, reason: 'timeout' };
  }
  if (isRetryableProviderServerFailure(error)) {
    return { error, maxAttempts: MAX_SERVER_ATTEMPTS, reason: 'server' };
  }
  if (isRetryableProviderRateLimitFailure(error)) {
    return { error, maxAttempts: MAX_SERVER_ATTEMPTS, reason: 'rate_limit' };
  }
  return null;
}

/** Undefined means the failure is not worth another attempt at this point. */
function retryDelayMs(
  failure: RetryableStreamFailure,
  attempt: number,
): number | undefined {
  if (attempt >= failure.maxAttempts) return undefined;
  return failure.reason === 'rate_limit'
    ? rateLimitRetryDelayMs(failure.error, attempt)
    : SETUP_RETRY_BACKOFF_MS * attempt;
}

function backoff(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AttemptUsageAccumulator {
  private inputTokens?: number;
  private outputTokens?: number;
  private cacheReadInputTokens?: number;
  private cacheWriteInputTokens?: number;
  private available = false;

  add(usage: StreamInferenceResponseChunk['usage']): void {
    if (!usage || !this.hasReportedDimension(usage)) return;
    this.available = true;
    if (usage.inputTokens !== undefined) this.inputTokens = usage.inputTokens;
    if (usage.outputTokens !== undefined)
      this.outputTokens = usage.outputTokens;
    if (usage.cacheReadInputTokens !== undefined)
      this.cacheReadInputTokens = usage.cacheReadInputTokens;
    if (usage.cacheWriteInputTokens !== undefined)
      this.cacheWriteInputTokens = usage.cacheWriteInputTokens;
  }

  result(): StreamInferenceAttemptUsage | undefined {
    if (!this.available) return undefined;
    return {
      inputTokens:
        (this.inputTokens ?? 0) +
        (this.cacheReadInputTokens ?? 0) +
        (this.cacheWriteInputTokens ?? 0),
      outputTokens: this.outputTokens ?? 0,
    };
  }

  private hasReportedDimension(
    usage: NonNullable<StreamInferenceResponseChunk['usage']>,
  ): boolean {
    return (
      usage.inputTokens !== undefined ||
      usage.outputTokens !== undefined ||
      usage.cacheReadInputTokens !== undefined ||
      usage.cacheWriteInputTokens !== undefined
    );
  }
}

function emitsOutput(chunk: StreamInferenceResponseChunk): boolean {
  return Boolean(
    chunk.textContentDelta ||
    chunk.thinkingDelta ||
    chunk.toolCallsDelta.length > 0,
  );
}

function failedAttemptResult(
  error: unknown,
  controller: AbortController,
  outputEmitted: boolean,
): Extract<StreamAttemptResult, { type: 'failed' }> {
  const reason: unknown = controller.signal.reason;
  return {
    type: 'failed',
    error: reason instanceof InferenceStreamStalledError ? reason : error,
    outputEmitted,
  };
}

function attemptOutcome(
  error: unknown,
  controller: AbortController,
): AttemptOutcome {
  const reason: unknown = controller.signal.reason;
  if (reason instanceof InferenceStreamStalledError) return 'failed';
  if (controller.signal.aborted) return 'aborted';
  if (error instanceof Error && error.name === 'AbortError') return 'aborted';
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'abort'
  ) {
    return 'aborted';
  }
  return 'failed';
}

/**
 * Streaming inference handler backed by a `@ayunis` ModelProvider. Concrete
 * providers (Anthropic, Bedrock, Azure, OpenAI-compatible derivatives) only
 * supply `createProvider` — building the credentialed `ModelProvider` for a
 * given model. Message/tool conversion, streaming and chunk mapping live here.
 *
 * Provider wire-format (tool schema normalization, strict mode, …) lives in
 * the `@ayunis` packages; this tier only owns host-side concerns.
 */
export abstract class RuntimeStreamInferenceHandler extends StreamInferenceHandler {
  private readonly providerCache = new Map<
    string,
    { revision: number; provider: ModelProvider }
  >();
  protected readonly logger = new Logger(RuntimeStreamInferenceHandler.name);

  protected constructor(
    protected readonly imageContentService: ImageContentService,
  ) {
    super();
  }

  /** Builds the credentialed provider for the requested model. */
  protected abstract createProvider(model: Model): ModelProvider;

  /**
   * Returns a fresh, possibly stateful transform applied to each provider
   * chunk. Defaults to identity; the `<think>`-tag handlers override it.
   */
  protected createChunkTransform(): ChunkTransform {
    return (chunk) => chunk;
  }

  /** Memoizes the provider per model revision so the vendor SDK client is reused. */
  private getProvider(model: Model): ModelProvider {
    const revision = model.updatedAt.getTime();
    const cached = this.providerCache.get(model.id);
    if (cached?.revision === revision) {
      return cached.provider;
    }
    const provider = this.createProvider(model);
    this.providerCache.set(model.id, { revision, provider });
    return provider;
  }

  /**
   * Wraps the credentialed provider so its chunk stream is fed through this
   * handler's per-request transform — the same one `answer()` applies — before
   * the agent runtime accumulates it. A fresh transform is created per
   * `stream()` call because it may be stateful across a single turn.
   */
  resolveProvider(model: Model): ModelProvider {
    const provider = this.getProvider(model);
    return {
      name: provider.name,
      stream: (request) =>
        applyChunkTransform(
          provider.stream(request),
          this.createChunkTransform(),
        ),
    };
  }

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      const controller = new AbortController();
      void this.streamResponse(input, subscriber, controller);
      // Unsubscribing (client disconnect, downstream error) cancels the
      // provider call. Without this the stream runs to completion unread and
      // the tokens are billed for nobody.
      return () => controller.abort();
    });
  }

  private async streamResponse(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
    controller: AbortController,
  ): Promise<void> {
    const watchdog = new StreamIdleWatchdog(STREAM_IDLE_TIMEOUT_MS, () =>
      controller.abort(new InferenceStreamStalledError(STREAM_IDLE_TIMEOUT_MS)),
    );
    try {
      const request = await toProviderRequest(input, this.imageContentService);
      const provider = this.getProvider(input.model);
      for (let attempt = 1; ; attempt++) {
        const result = await this.streamAttempt({
          input,
          provider,
          request,
          subscriber,
          controller,
          watchdog,
        });
        if (result.type === 'completed') {
          subscriber.complete();
          return;
        }
        const setupFailure = this.retryableFailure(result, controller);
        if (!setupFailure) throw result.error;
        const delayMs = retryDelayMs(setupFailure, attempt);
        if (delayMs === undefined) throw result.error;
        await backoff(delayMs);
        if (controller.signal.aborted) throw result.error;
        this.logRetry(input, attempt, setupFailure);
      }
    } catch (error) {
      subscriber.error(error);
    } finally {
      watchdog.stop();
    }
  }

  private retryableFailure(
    result: Extract<StreamAttemptResult, { type: 'failed' }>,
    controller: AbortController,
  ): RetryableStreamFailure | null {
    if (
      result.outputEmitted ||
      controller.signal.aborted ||
      !(result.error instanceof Error)
    ) {
      return null;
    }
    return retryableStreamFailure(result.error);
  }

  private logRetry(
    input: StreamInferenceInput,
    attempt: number,
    failure: RetryableStreamFailure,
  ): void {
    this.logger.warn(
      {
        model: input.model.name,
        provider: input.model.provider,
        attempt,
        reason: failure.reason,
      },
      'Provider stream failed before the first chunk',
    );
  }

  private async streamAttempt(
    params: StreamAttemptParams,
  ): Promise<StreamAttemptResult> {
    const { input, provider, request, subscriber, controller, watchdog } =
      params;
    const requestId = randomUUID();
    await input.attemptLifecycle?.onAttemptStart({ requestId });
    const transform = this.createChunkTransform();
    const usage = new AttemptUsageAccumulator();
    let outputEmitted = false;
    let consumptionStarted = false;
    try {
      for await (const providerChunk of provider.stream({
        ...request,
        signal: controller.signal,
      })) {
        consumptionStarted = true;
        watchdog.notifyChunk();
        const chunk = toStreamChunk(transform(providerChunk));
        usage.add(chunk.usage);
        outputEmitted ||= emitsOutput(chunk);
        subscriber.next(chunk);
      }
    } catch (error) {
      watchdog.stop();
      await this.notifyTerminal(
        input,
        {
          requestId,
          outcome: attemptOutcome(error, controller),
          usage: usage.result(),
          outputEmitted,
        },
        consumptionStarted,
      );
      return failedAttemptResult(error, controller, outputEmitted);
    }
    watchdog.stop();
    await this.notifyTerminal(
      input,
      {
        requestId,
        outcome: 'completed',
        usage: usage.result(),
        outputEmitted,
      },
      true,
    );
    return { type: 'completed' };
  }

  private async notifyTerminal(
    input: StreamInferenceInput,
    context: StreamInferenceAttemptTerminalContext,
    accountingRequired: boolean,
  ): Promise<void> {
    if (!accountingRequired || !input.attemptLifecycle) return;
    await input.attemptLifecycle.onAttemptTerminal(context);
  }
}
