import { randomUUID } from 'node:crypto';

import type { ChatResponse, ToolCall as OllamaToolCall } from 'ollama';

import type {
  FinishReason,
  ProviderChunk,
  ToolCallDelta,
  ToolNameCodec,
} from '@ayunis/inference';

/**
 * Converts one Ollama chat stream chunk to a provider-agnostic chunk. Returns
 * null for chunks that carry nothing usable. Native `thinking` maps straight to
 * a thinking delta; `content` is forwarded verbatim (any inline `<think>` tags
 * are split host-side). Usage and finish reason arrive on the final (`done`)
 * chunk.
 */
export const convertChunk = (
  chunk: ChatResponse,
  codec: ToolNameCodec,
): ProviderChunk | null => {
  const message = chunk.message;
  const result: ProviderChunk = {};
  let carriesSomething = false;

  if (message.thinking) {
    result.thinkingDelta = message.thinking;
    carriesSomething = true;
  }
  if (message.content) {
    result.textDelta = message.content;
    carriesSomething = true;
  }
  const toolCallDeltas = extractToolCallDeltas(message.tool_calls, codec);
  if (toolCallDeltas.length > 0) {
    result.toolCallDeltas = toolCallDeltas;
    carriesSomething = true;
  }
  if (chunk.done) {
    result.finishReason = mapFinishReason(chunk.done_reason);
    result.usage = {
      inputTokens: chunk.prompt_eval_count,
      outputTokens: chunk.eval_count,
    };
    carriesSomething = true;
  }

  return carriesSomething ? result : null;
};

const extractToolCallDeltas = (
  toolCalls: OllamaToolCall[] | undefined,
  codec: ToolNameCodec,
): ToolCallDelta[] =>
  toolCalls?.map((toolCall, index) => {
    const wireName = toolCall.function.name;
    const name = codec.decode(wireName);
    return {
      index,
      id: randomUUID(),
      name,
      argumentsDelta: JSON.stringify(toolCall.function.arguments),
      // Record what the model actually saw when names were translated.
      ...(name !== wireName ? { providerMetadata: { wireName } } : {}),
    };
  }) ?? [];

// Ollama reports `done_reason` as a free-form string; `done` already signals
// completion, so an unrecognized reason falls back to a plain stop.
const mapFinishReason = (reason: string | undefined): FinishReason =>
  reason === 'length' ? 'length' : 'stop';
