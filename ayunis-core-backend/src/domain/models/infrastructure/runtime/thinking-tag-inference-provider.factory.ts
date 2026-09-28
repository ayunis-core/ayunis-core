import { RuntimeInferenceProviderFactory } from './runtime-inference-provider.factory';
import type { ChunkTransform } from './chunk-transform';
import { createThinkTagChunkTransform } from './think-tag-transform';

/**
 * Factory for self-hosted OpenAI-compatible and Ollama routes whose reasoning
 * models may wrap thinking in inline `<think>…</think>` tags. Opt-in over the
 * plain runtime base: it splits that reasoning out into thinking deltas.
 */
export abstract class ThinkingTagInferenceProviderFactory extends RuntimeInferenceProviderFactory {
  protected createChunkTransform(): ChunkTransform {
    return createThinkTagChunkTransform();
  }
}
