import type { ProviderChunk } from '@ayunis/inference';

/**
 * A per-request transform applied to each provider chunk before any consumer
 * sees it. May be stateful across a stream (e.g. the `<think>` tag parser
 * buffers partial tags), so factories create a fresh one per request.
 * Defaults to identity in the runtime base factory.
 */
export type ChunkTransform = (chunk: ProviderChunk) => ProviderChunk;

/** Applies a ChunkTransform to every chunk of a provider stream. */
export async function* applyChunkTransform(
  stream: AsyncIterable<ProviderChunk>,
  transform: ChunkTransform,
): AsyncIterable<ProviderChunk> {
  for await (const chunk of stream) {
    yield transform(chunk);
  }
}
