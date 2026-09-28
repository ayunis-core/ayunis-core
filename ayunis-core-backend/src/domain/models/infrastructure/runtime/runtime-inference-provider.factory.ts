import type { ModelProvider as InferenceProvider } from '@ayunis/inference';
import { InferenceProviderFactory } from 'src/domain/models/application/ports/inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';
import type { ChunkTransform } from './chunk-transform';
import { applyChunkTransform } from './chunk-transform';

/**
 * Provider factory backed by a `@ayunis` provider package. Concrete providers
 * only supply `createProvider` — the credentialed package provider for a
 * model. Provider wire-format (tool schema normalization, strict mode, …)
 * lives in the packages; this tier only owns host-side concerns.
 */
export abstract class RuntimeInferenceProviderFactory extends InferenceProviderFactory {
  private readonly providerCache = new Map<
    string,
    { revision: number; provider: InferenceProvider }
  >();

  protected abstract createProvider(model: Model): InferenceProvider;

  /**
   * Returns a fresh, possibly stateful transform applied to each provider
   * chunk. Defaults to identity; the `<think>`-tag factories override it.
   */
  protected createChunkTransform(): ChunkTransform {
    return (chunk) => chunk;
  }

  /**
   * A fresh transform is created per `stream()` call because it may be
   * stateful across a single response.
   */
  resolveProvider(model: Model): InferenceProvider {
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

  /** Memoizes the provider per model revision so the vendor SDK client is reused. */
  private getProvider(model: Model): InferenceProvider {
    const revision = model.updatedAt.getTime();
    const cached = this.providerCache.get(model.id);
    if (cached?.revision === revision) {
      return cached.provider;
    }
    const provider = this.createProvider(model);
    this.providerCache.set(model.id, { revision, provider });
    return provider;
  }
}
