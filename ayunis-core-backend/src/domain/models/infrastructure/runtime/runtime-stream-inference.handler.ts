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
import {
  StreamIdleWatchdog,
  STREAM_IDLE_TIMEOUT_MS,
} from './stream-idle-watchdog';
import { InferenceStreamStalledError } from '../../application/models.errors';

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
      const transform = this.createChunkTransform();
      for await (const chunk of provider.stream({
        ...request,
        signal: controller.signal,
      })) {
        watchdog.notifyChunk();
        subscriber.next(toStreamChunk(transform(chunk)));
      }
      subscriber.complete();
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
}
