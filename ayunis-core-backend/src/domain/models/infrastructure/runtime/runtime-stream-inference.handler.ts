import type { Subscriber } from 'rxjs';
import { Observable } from 'rxjs';
import type { ModelProvider } from '@ayunis/inference';
import type {
  StreamInferenceInput,
  StreamInferenceResponseChunk,
} from '../../application/ports/stream-inference.handler';
import { StreamInferenceHandler } from '../../application/ports/stream-inference.handler';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type { Model } from '../../domain/model.entity';
import { toProviderRequest } from './request.mapper';
import { toStreamChunk } from './chunk.mapper';
import type { ChunkTransform } from './chunk-transform';
import { applyChunkTransform } from './chunk-transform';
import { Logger } from '@nestjs/common';
import {
  StreamIdleWatchdog,
  STREAM_FIRST_CHUNK_TIMEOUT_MS,
  STREAM_IDLE_TIMEOUT_MS,
} from 'src/common/streaming/stream-idle-watchdog';
import { relayAbort } from 'src/common/streaming/relay-abort';
import { InferenceStreamStalledError } from '../../application/models.errors';

/**
 * One retry, and only when the stalled attempt emitted nothing: once a chunk
 * has reached the subscriber it may already be persisted downstream, so a
 * second attempt would duplicate content.
 */
const MAX_STREAM_ATTEMPTS = 2;

type ProviderStreamRequest = Parameters<ModelProvider['stream']>[0];

interface StreamAttemptOutcome {
  stalled?: InferenceStreamStalledError;
  chunksEmitted: number;
}

function stalledReason(
  signal: AbortSignal,
): InferenceStreamStalledError | undefined {
  return signal.aborted && signal.reason instanceof InferenceStreamStalledError
    ? signal.reason
    : undefined;
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
  private readonly logger = new Logger(RuntimeStreamInferenceHandler.name);
  private readonly providerCache = new Map<string, ModelProvider>();

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
      const cancellation = new AbortController();
      // streamResponse routes every failure into the subscriber; this catch
      // only guards against the subscriber itself throwing, which would
      // otherwise become an unhandled rejection reported as a raw AbortError.
      this.streamResponse(input, subscriber, cancellation.signal).catch(
        (error: unknown) => {
          this.logger.error('Stream pipeline failed outside the subscriber', {
            error: error instanceof Error ? error.message : String(error),
          });
        },
      );
      // Unsubscribing (client disconnect, downstream error) cancels the
      // provider call. Without this the stream runs to completion unread and
      // the tokens are billed for nobody.
      return () => cancellation.abort();
    });
  }

  private async streamResponse(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
    cancelSignal: AbortSignal,
  ): Promise<void> {
    try {
      const request = await toProviderRequest(input, this.imageContentService);
      const provider = this.getProvider(input.model);
      for (let attempt = 1; ; attempt++) {
        const outcome = await this.streamAttempt(
          provider,
          request,
          subscriber,
          cancelSignal,
        );
        if (!outcome.stalled) {
          subscriber.complete();
          return;
        }
        // No retry once the caller has cancelled — the subscriber is gone,
        // so a second attempt would only bill tokens nobody reads.
        if (
          outcome.chunksEmitted > 0 ||
          attempt >= MAX_STREAM_ATTEMPTS ||
          cancelSignal.aborted
        ) {
          throw outcome.stalled;
        }
        this.logger.warn('Provider stream stalled before the first chunk', {
          model: input.model.name,
          provider: input.model.provider,
          attempt,
        });
      }
    } catch (error) {
      subscriber.error(error);
    }
  }

  /**
   * Runs one provider attempt on its own controller so the stall watchdog
   * can abort it without consuming the caller's cancellation signal. A stall
   * is returned rather than thrown because SDKs disagree on what an abort
   * looks like: some reject with a generic AbortError, the stainless SDKs
   * (openai, anthropic) swallow it and end the stream as if it completed —
   * which would otherwise persist a silently truncated message.
   */
  private async streamAttempt(
    provider: ModelProvider,
    request: ProviderStreamRequest,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
    cancelSignal: AbortSignal,
  ): Promise<StreamAttemptOutcome> {
    const controller = new AbortController();
    const stopRelayingAbort = relayAbort(cancelSignal, controller);
    const watchdog = new StreamIdleWatchdog(
      STREAM_IDLE_TIMEOUT_MS,
      (elapsedMs) =>
        controller.abort(new InferenceStreamStalledError(elapsedMs)),
    );
    const transform = this.createChunkTransform();
    let chunksEmitted = 0;
    try {
      watchdog.arm(STREAM_FIRST_CHUNK_TIMEOUT_MS);
      for await (const chunk of provider.stream({
        ...request,
        signal: controller.signal,
      })) {
        watchdog.notifyChunk();
        chunksEmitted += 1;
        subscriber.next(toStreamChunk(transform(chunk)));
      }
      return { stalled: stalledReason(controller.signal), chunksEmitted };
    } catch (error) {
      const stalled = stalledReason(controller.signal);
      if (stalled) {
        return { stalled, chunksEmitted };
      }
      throw error;
    } finally {
      watchdog.stop();
      stopRelayingAbort();
    }
  }
}
