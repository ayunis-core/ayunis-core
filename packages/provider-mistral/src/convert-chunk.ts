import type {
  CompletionEvent,
  ContentChunk,
  ToolCall,
} from '@mistralai/mistralai/models/components';

import type {
  FinishReason,
  ProviderChunk,
  ToolCallDelta,
} from '@ayunis/inference';

/**
 * Converts one Mistral chat stream event to a provider-agnostic chunk. Returns
 * null for events that carry nothing usable. Usage arrives on the final event.
 */
export const convertChunk = (event: CompletionEvent): ProviderChunk | null => {
  const result: ProviderChunk = {};
  let carriesSomething = false;

  const choice = event.data.choices.at(0);
  if (choice) {
    const textDelta = extractTextDelta(choice.delta.content);
    if (textDelta) {
      result.textDelta = textDelta;
      carriesSomething = true;
    }
    const toolCallDeltas = extractToolCallDeltas(choice.delta.toolCalls);
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
): ToolCallDelta[] => {
  if (!toolCalls) {
    return [];
  }
  return toolCalls
    .filter((tc) => tc.index !== undefined)
    .map((tc) => ({
      index: tc.index!,
      id: tc.id ?? null,
      name: tc.function.name,
      argumentsDelta:
        typeof tc.function.arguments === 'string'
          ? tc.function.arguments
          : JSON.stringify(tc.function.arguments),
    }));
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
