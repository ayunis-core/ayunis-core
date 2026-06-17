import type { ProviderChunk, ToolCallDelta } from '@ayunis/inference';
import {
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';

/**
 * Maps a provider-agnostic `ProviderChunk` (from a `@ayunis` ModelProvider
 * stream) to the backend's `StreamInferenceResponseChunk`. The two shapes are
 * near-identical; this is a field-by-field translation.
 */
export function toStreamChunk(
  chunk: ProviderChunk,
): StreamInferenceResponseChunk {
  // Only the constructor's required fields need an explicit undefined -> null
  // coalesce; its optional fields already default to null internally.
  return new StreamInferenceResponseChunk({
    thinkingDelta: nullable(chunk.thinkingDelta),
    thinkingId: chunk.thinkingId,
    thinkingSignature: chunk.thinkingSignature,
    textContentDelta: nullable(chunk.textDelta),
    textProviderMetadata: chunk.textProviderMetadata,
    toolCallsDelta: (chunk.toolCallDeltas ?? []).map(toToolCallDelta),
    finishReason: nullable(chunk.finishReason),
    usage: chunk.usage,
  });
}

function toToolCallDelta(
  delta: ToolCallDelta,
): StreamInferenceResponseChunkToolCall {
  return new StreamInferenceResponseChunkToolCall({
    index: delta.index,
    id: nullable(delta.id),
    name: nullable(delta.name),
    argumentsDelta: nullable(delta.argumentsDelta),
    providerMetadata: delta.providerMetadata,
  });
}

/** Normalizes an optional string facet to the `string | null` the port uses. */
function nullable(value: string | null | undefined): string | null {
  return value ?? null;
}
