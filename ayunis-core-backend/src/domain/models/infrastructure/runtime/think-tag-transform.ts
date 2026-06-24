import { ThinkingContentParser } from 'src/common/util/thinking-content-parser';
import type { ChunkTransform } from './chunk-transform';

/**
 * Creates a stateful chunk transform that splits inline `<think>…</think>`
 * reasoning out of text deltas into thinking deltas. Some self-hosted
 * OpenAI-compatible reasoning models (served via OTC/StackIT/Scaleway) wrap
 * their reasoning this way; real OpenAI/Azure models never do, so this is
 * opt-in per provider. Applied uniformly to streaming and non-streaming paths.
 */
export const createThinkTagChunkTransform = (): ChunkTransform => {
  const parser = new ThinkingContentParser();
  return (chunk) => {
    if (!chunk.textDelta) {
      return chunk;
    }
    const { thinkingDelta, textContentDelta } = parser.parse(chunk.textDelta);
    return {
      ...chunk,
      textDelta: textContentDelta,
      thinkingDelta: thinkingDelta ?? chunk.thinkingDelta ?? null,
    };
  };
};
