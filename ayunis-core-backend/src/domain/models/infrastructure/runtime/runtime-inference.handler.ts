import type { ModelProvider } from '@ayunis/inference';
import type {
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { InferenceHandler } from '../../application/ports/inference.handler';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type { Model } from '../../domain/model.entity';
import { toProviderRequest } from './request.mapper';
import { accumulateResponse } from './response-accumulator';
import type { ChunkTransform } from './chunk-transform';
import { applyChunkTransform } from './chunk-transform';

/**
 * Non-streaming inference handler backed by a `@ayunis` ModelProvider. The
 * provider packages are streaming-only, so this drives the stream to
 * completion and folds it into an `InferenceResponse`. Concrete providers only
 * supply `createProvider`.
 *
 * Provider wire-format lives in the `@ayunis` packages; this tier only owns
 * host-side concerns, applied to both streaming and non-streaming paths.
 */
export abstract class RuntimeInferenceHandler extends InferenceHandler {
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
   * chunk before accumulation. Defaults to identity; the `<think>`-tag
   * handlers override it so non-streaming output is parsed like streaming.
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

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    const request = await toProviderRequest(input, this.imageContentService);
    const provider = this.getProvider(input.model);
    const transform = this.createChunkTransform();
    return accumulateResponse(
      applyChunkTransform(provider.stream(request), transform),
    );
  }
}
