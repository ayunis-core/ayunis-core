import { RuntimeStreamInferenceHandler } from './runtime-stream-inference.handler';
import type { ChunkTransform } from './chunk-transform';
import { createThinkTagChunkTransform } from './think-tag-transform';

/**
 * Streaming handler for self-hosted OpenAI-compatible routes (OTC, StackIT,
 * Scaleway) whose reasoning models may wrap thinking in inline
 * `<think>…</think>` tags. Opt-in over the plain runtime base: it splits that
 * reasoning out into thinking deltas. Wire-format stays in the package.
 */
export abstract class ThinkingTagStreamInferenceHandler extends RuntimeStreamInferenceHandler {
  protected createChunkTransform(): ChunkTransform {
    return createThinkTagChunkTransform();
  }
}
