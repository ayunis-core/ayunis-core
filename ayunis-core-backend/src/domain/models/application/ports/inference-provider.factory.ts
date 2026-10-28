import type { ModelProvider as InferenceProvider } from '@ayunis/inference';
import type { Model } from 'src/domain/models/domain/model.entity';

/**
 * Builds the credentialed `@ayunis/inference` provider for a model of one
 * provider family. The returned provider already applies any host-side chunk
 * transforms, so every consumer — direct inference and the agent runtime —
 * streams identical chunks.
 */
export abstract class InferenceProviderFactory {
  abstract resolveProvider(model: Model): InferenceProvider;
}
