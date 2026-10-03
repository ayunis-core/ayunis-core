import type { ModelProvider } from '@ayunis/inference';
import type { Subscriber } from 'rxjs';
import { Observable } from 'rxjs';
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
  failedCallOutcome,
  InferenceCallTracker,
} from './inference-call-tracker';
import {
  StreamIdleWatchdog,
  STREAM_IDLE_TIMEOUT_MS,
} from 'src/common/streaming/stream-idle-watchdog';
import { InferenceStreamStalledError } from 'src/domain/models/application/models.errors';

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

  /**
   * Makes exactly one provider call. Retrying is the caller's decision: a
   * hidden retry here would multiply billable upstream calls per request.
   */
  private async streamResponse(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
    controller: AbortController,
  ): Promise<void> {
    const watchdog = new StreamIdleWatchdog(STREAM_IDLE_TIMEOUT_MS, () =>
      controller.abort(new InferenceStreamStalledError(STREAM_IDLE_TIMEOUT_MS)),
    );
    try {
      await this.streamCall(input, subscriber, controller, watchdog);
      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    } finally {
      watchdog.stop();
    }
  }

  private async streamCall(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
    controller: AbortController,
    watchdog: StreamIdleWatchdog,
  ): Promise<void> {
    const request = await toProviderRequest(input, this.imageContentService);
    const call = new InferenceCallTracker();
    const chunks = call.track(
      applyChunkTransform(
        this.getProvider(input.model).stream({
          ...request,
          signal: controller.signal,
        }),
        this.createChunkTransform(),
      ),
    );
    try {
      for await (const chunk of chunks) {
        watchdog.notifyChunk();
        subscriber.next(toStreamChunk(chunk));
      }
    } catch (error) {
      // Stop first so slow accounting cannot be mistaken for a stall.
      watchdog.stop();
      await call.settle(
        failedCallOutcome(error, controller.signal),
        input.onCallTerminal,
      );
      throw stallReasonOr(error, controller.signal);
    }
    watchdog.stop();
    await call.settle('completed', input.onCallTerminal);
  }
}

function stallReasonOr(error: unknown, signal: AbortSignal): unknown {
  const reason: unknown = signal.reason;
  return reason instanceof InferenceStreamStalledError ? reason : error;
}
