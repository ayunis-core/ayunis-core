import type { GenerateContentResponse, Part } from '@google/genai';
import { FinishReason as GeminiFinishReason } from '@google/genai';

import type {
  FinishReason,
  ProviderChunk,
  ProviderMetadata,
  ToolCallDelta,
  ToolNameCodec,
} from '@ayunis/inference';

interface CollectedParts {
  text: string;
  textSignature: string | undefined;
  toolCallDeltas: ToolCallDelta[];
}

/**
 * Converts one Gemini streaming chunk to a provider-agnostic chunk. Returns
 * null for chunks that carry nothing usable. Text and tool-call parts carry
 * their `thoughtSignature` (as `{ gemini: { thoughtSignature } }`) so reasoning
 * round-trips. Gemini reports cumulative usage on every chunk; the runtime
 * accumulator takes last-wins, so it is emitted as-is.
 */
export const convertChunk = (
  chunk: GenerateContentResponse,
  codec: ToolNameCodec,
): ProviderChunk | null => {
  const candidate = chunk.candidates?.[0];
  const collected = collectParts(candidate?.content?.parts ?? [], codec);

  const result: ProviderChunk = {
    ...textFacet(collected),
    ...toolFacet(collected),
    ...finishFacet(candidate?.finishReason),
    ...usageFacet(chunk.usageMetadata),
  };

  return Object.keys(result).length > 0 ? result : null;
};

const collectParts = (
  parts: readonly Part[],
  codec: ToolNameCodec,
): CollectedParts => {
  let text = '';
  let textSignature: string | undefined;
  const toolCallDeltas: ToolCallDelta[] = [];
  parts.forEach((part, index) => {
    if (part.text) {
      text += part.text;
      textSignature ??= part.thoughtSignature;
    }
    if (part.functionCall) {
      toolCallDeltas.push(toToolCallDelta(part, index, codec));
    }
  });
  return { text, textSignature, toolCallDeltas };
};

const textFacet = ({ text, textSignature }: CollectedParts): ProviderChunk => {
  if (!text) {
    return {};
  }
  const metadata = toProviderMetadata(textSignature);
  return metadata
    ? { textDelta: text, textProviderMetadata: metadata }
    : { textDelta: text };
};

const toolFacet = ({ toolCallDeltas }: CollectedParts): ProviderChunk =>
  toolCallDeltas.length > 0 ? { toolCallDeltas } : {};

const finishFacet = (reason: GeminiFinishReason | undefined): ProviderChunk => {
  const finishReason = mapFinishReason(reason);
  return finishReason ? { finishReason } : {};
};

const usageFacet = (
  usage:
    { promptTokenCount?: number; candidatesTokenCount?: number } | undefined,
): ProviderChunk =>
  usage
    ? {
        usage: {
          inputTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount,
        },
      }
    : {};

const toToolCallDelta = (
  part: Part,
  index: number,
  codec: ToolNameCodec,
): ToolCallDelta => {
  const fc = part.functionCall ?? {};
  const wireName = fc.name ?? null;
  const name = wireName === null ? null : codec.decode(wireName);
  const delta: ToolCallDelta = {
    index,
    id: fc.id ?? wireName ?? null,
    name,
    argumentsDelta: stringifyArgs(fc.args),
  };
  // Merge the thought signature with the wire name the model actually saw.
  const metadata = {
    ...toProviderMetadata(part.thoughtSignature),
    ...(name !== null && name !== wireName ? { wireName } : {}),
  };
  if (Object.keys(metadata).length > 0) {
    delta.providerMetadata = metadata;
  }
  return delta;
};

const stringifyArgs = (
  args: Record<string, unknown> | undefined,
): string | null => (args ? JSON.stringify(args) : null);

const toProviderMetadata = (signature: string | undefined): ProviderMetadata =>
  signature ? { gemini: { thoughtSignature: signature } } : null;

const mapFinishReason = (
  reason: GeminiFinishReason | undefined,
): FinishReason => {
  if (reason === GeminiFinishReason.STOP) {
    return 'stop';
  }
  if (reason === GeminiFinishReason.MAX_TOKENS) {
    return 'length';
  }
  return null;
};
