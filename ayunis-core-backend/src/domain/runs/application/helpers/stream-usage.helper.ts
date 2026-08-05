import { Logger } from '@nestjs/common';

const logger = new Logger('StreamUsage');

/** The one facet of a stream chunk this helper reads — structural on purpose, so it needs no cross-module port import. */
interface UsageBearingChunk {
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadInputTokens?: number;
    cacheWriteInputTokens?: number;
  };
}

export function extractUsageFromChunks(
  chunks: UsageBearingChunk[],
): { inputTokens: number; outputTokens: number } | undefined {
  const usage = lastWinsUsage(chunks);
  const uncachedInputTokens = usage.inputTokens ?? 0;
  const cacheRead = usage.cacheReadInputTokens ?? 0;
  const cacheWrite = usage.cacheWriteInputTokens ?? 0;
  const hasCache = cacheRead > 0 || cacheWrite > 0;
  if (
    usage.inputTokens === undefined &&
    usage.outputTokens === undefined &&
    !hasCache
  ) {
    return undefined;
  }
  if (hasCache) {
    logger.debug('Prompt cache activity', {
      uncachedInputTokens,
      cacheReadInputTokens: cacheRead,
      cacheWriteInputTokens: cacheWrite,
    });
  }
  // Cached prompt tokens are billed as ordinary input: the provider's
  // inputTokens excludes tokens covered by the prompt cache, so without
  // this the billed input collapses to the uncached remainder (~3 tokens).
  return {
    inputTokens: uncachedInputTokens + cacheRead + cacheWrite,
    outputTokens: usage.outputTokens ?? 0,
  };
}

/**
 * Providers report cumulative usage on every chunk (Gemini repeats
 * promptTokenCount on each chunk; candidatesTokenCount only appears on the
 * final one). Summing across chunks would over-count, so take last-wins per
 * field, matching the non-streaming accumulator (response-accumulator.ts).
 */
function lastWinsUsage(
  chunks: UsageBearingChunk[],
): NonNullable<UsageBearingChunk['usage']> {
  const result: NonNullable<UsageBearingChunk['usage']> = {};
  for (const chunk of chunks) {
    if (!chunk.usage) continue;
    if (chunk.usage.inputTokens !== undefined) {
      result.inputTokens = chunk.usage.inputTokens;
    }
    if (chunk.usage.outputTokens !== undefined) {
      result.outputTokens = chunk.usage.outputTokens;
    }
    if (chunk.usage.cacheReadInputTokens !== undefined) {
      result.cacheReadInputTokens = chunk.usage.cacheReadInputTokens;
    }
    if (chunk.usage.cacheWriteInputTokens !== undefined) {
      result.cacheWriteInputTokens = chunk.usage.cacheWriteInputTokens;
    }
  }
  return result;
}
