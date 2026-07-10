import type {
  CompletionEvent,
  ContentChunk,
  ToolCall,
} from '@mistralai/mistralai/models/components';

import type {
  FinishReason,
  ProviderChunk,
  ToolCallDelta,
  ToolNameCodec,
} from '@ayunis/inference';

/**
 * Converts one Mistral chat stream event to a provider-agnostic chunk. Returns
 * null for events that carry nothing usable. Usage arrives on the final event.
 */
export const convertChunk = (
  event: CompletionEvent,
  codec: ToolNameCodec,
): ProviderChunk | null => {
  const result: ProviderChunk = {};
  let carriesSomething = false;

  const choice = event.data.choices.at(0);
  if (choice) {
    const textDelta = extractTextDelta(choice.delta.content);
    if (textDelta) {
      result.textDelta = textDelta;
      carriesSomething = true;
    }
    const toolCallDeltas = extractToolCallDeltas(choice.delta.toolCalls, codec);
    if (toolCallDeltas.length > 0) {
      result.toolCallDeltas = toolCallDeltas;
      carriesSomething = true;
    }
    if (choice.finishReason) {
      result.finishReason = mapFinishReason(choice.finishReason);
      carriesSomething = true;
    }
  }

  if (event.data.usage) {
    result.usage = {
      inputTokens: event.data.usage.promptTokens,
      outputTokens: event.data.usage.completionTokens,
    };
    carriesSomething = true;
  }

  return carriesSomething ? result : null;
};

const extractTextDelta = (
  content: string | ContentChunk[] | null | undefined,
): string | null => {
  if (!content) {
    return null;
  }
  if (Array.isArray(content)) {
    return (
      content
        .map((c) => (c.type === 'text' ? c.text : null))
        .filter(Boolean)
        .join('') || null
    );
  }
  return content;
};

const extractToolCallDeltas = (
  toolCalls: ToolCall[] | null | undefined,
  codec: ToolNameCodec,
): ToolCallDelta[] => {
  if (!toolCalls) {
    return [];
  }
  return toolCalls
    .filter((tc) => tc.index !== undefined)
    .map((tc) => {
      const wireName = tc.function.name;
      const name = codec.decode(wireName);
      return {
        index: tc.index!,
        id: tc.id ?? null,
        name,
        argumentsDelta:
          typeof tc.function.arguments === 'string'
            ? tc.function.arguments
            : JSON.stringify(tc.function.arguments),
        // Record what the model actually saw when names were translated.
        ...(name !== wireName ? { providerMetadata: { wireName } } : {}),
      };
    });
};

const mapFinishReason = (reason: string): FinishReason => {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
      return 'tool_calls';
    default:
      return null;
  }
};
