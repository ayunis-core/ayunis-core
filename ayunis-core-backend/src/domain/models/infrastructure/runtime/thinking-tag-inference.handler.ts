import { RuntimeInferenceHandler } from './runtime-inference.handler';
import type { ChunkTransform } from './chunk-transform';
import { createThinkTagChunkTransform } from './think-tag-transform';

/**
 * Non-streaming counterpart of `ThinkingTagStreamInferenceHandler` for the
 * self-hosted OpenAI-compatible routes (OTC, StackIT, Scaleway). Splits inline
 * `<think>…</think>` reasoning out of the accumulated response so non-streaming
 * calls behave like streaming ones.
 */
export abstract class ThinkingTagInferenceHandler extends RuntimeInferenceHandler {
  protected createChunkTransform(): ChunkTransform {
    return createThinkTagChunkTransform();
  }
}
