import { Logger } from '@nestjs/common';
import type { Subscriber } from 'rxjs';
import { Observable } from 'rxjs';
import type { ModelProvider } from '@ayunis/inference';
import type {
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
  isRetryableProviderServerFailure,
  isRetryableProviderTimeoutFailure,
  isRetryableSetupFailure,
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

interface RetryableStreamFailure {
  readonly error: Error;
  readonly maxAttempts: number;
  readonly reason: 'transport' | 'timeout' | 'server';
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
  return null;
}

function backoff(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  private readonly providerCache = new Map<string, ModelProvider>();
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

  /** Memoizes the provider per model so the vendor SDK client is reused. */
  private getProvider(model: Model): ModelProvider {
    const cached = this.providerCache.get(model.name);
    if (cached) {
      return cached;
    }
    const created = this.createProvider(model);
    this.providerCache.set(model.name, created);
    return created;
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
        const setupFailure = await this.streamAttempt(
          provider,
          request,
          subscriber,
          controller,
          watchdog,
        );
        if (!setupFailure) {
          return;
        }
        if (attempt >= setupFailure.maxAttempts) {
          throw setupFailure.error;
        }
        await backoff(SETUP_RETRY_BACKOFF_MS * attempt);
        // No retry once the caller has cancelled — the subscriber is gone,
        // so a second attempt would only bill tokens nobody reads.
        if (controller.signal.aborted) {
          throw setupFailure.error;
        }
        this.logger.warn(
          {
            model: input.model.name,
            provider: input.model.provider,
            attempt,
            reason: setupFailure.reason,
            err: setupFailure.error,
          },
          'Provider stream failed before the first chunk',
        );
      }
    } catch (error) {
      // A stalled stream surfaces from the SDK as a generic AbortError, which
      // the use case would otherwise read as a client cancellation. The abort
      // reason carries what actually happened.
      const reason: unknown = controller.signal.reason;
      subscriber.error(
        reason instanceof InferenceStreamStalledError ? reason : error,
      );
    } finally {
      watchdog.stop();
    }
  }

  /**
   * Runs one provider attempt. Returns a bounded retry decision for transient
   * transport or upstream server failures before the first chunk; stall
   * retries live upstream in the run loops (AYC-652). Completes the subscriber
   * and returns null on success; rethrows everything else.
   */
  private async streamAttempt(
    provider: ModelProvider,
    request: ProviderStreamRequest,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
    controller: AbortController,
    watchdog: StreamIdleWatchdog,
  ): Promise<RetryableStreamFailure | null> {
    const transform = this.createChunkTransform();
    let chunksEmitted = 0;
    try {
      for await (const chunk of provider.stream({
        ...request,
        signal: controller.signal,
      })) {
        chunksEmitted += 1;
        watchdog.notifyChunk();
        subscriber.next(toStreamChunk(transform(chunk)));
      }
      subscriber.complete();
      return null;
    } catch (error) {
      if (
        chunksEmitted === 0 &&
        !controller.signal.aborted &&
        error instanceof Error
      ) {
        const retryable = retryableStreamFailure(error);
        if (retryable) return retryable;
      }
      throw error;
    }
  }
}
