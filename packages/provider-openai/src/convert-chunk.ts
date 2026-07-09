import type { ChatCompletionChunk } from 'openai/resources/chat/completions';

import type {
  FinishReason,
  ProviderChunk,
  ToolNameCodec,
} from '@ayunis/inference';

/**
 * Converts one OpenAI Chat Completions stream chunk to a provider-agnostic
 * chunk. Returns null for chunks that carry nothing usable. Usage arrives in
 * a trailing chunk (requires stream_options.include_usage).
 */
export const convertChunk = (
  chunk: ChatCompletionChunk,
  codec: ToolNameCodec,
): ProviderChunk | null => {
  const result: ProviderChunk = {};
  let carriesSomething = false;

  // A trailing usage-only chunk carries an empty choices array.
  const choice = chunk.choices.at(0);
  if (choice) {
    if (choice.delta.content) {
      result.textDelta = choice.delta.content;
      carriesSomething = true;
    }
    if (choice.delta.tool_calls && choice.delta.tool_calls.length > 0) {
      result.toolCallDeltas = choice.delta.tool_calls.map((call) => {
        const wireName = call.function?.name ?? null;
        const name = wireName === null ? null : codec.decode(wireName);
        return {
          index: call.index,
          id: call.id ?? null,
          name,
          argumentsDelta: call.function?.arguments ?? null,
          // Record what the model actually saw when names were translated.
          ...(name !== null && name !== wireName
            ? { providerMetadata: { wireName } }
            : {}),
        };
      });
      carriesSomething = true;
    }
    if (choice.finish_reason) {
      result.finishReason = mapFinishReason(choice.finish_reason);
      carriesSomething = true;
    }
  }

  if (chunk.usage) {
    result.usage = {
      inputTokens: chunk.usage.prompt_tokens,
      outputTokens: chunk.usage.completion_tokens,
    };
    carriesSomething = true;
  }

  return carriesSomething ? result : null;
};

const mapFinishReason = (
  reason: NonNullable<ChatCompletionChunk.Choice['finish_reason']>,
): FinishReason => {
  switch (reason) {
    case 'stop':
    case 'content_filter':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
    case 'function_call':
      return 'tool_calls';
    default:
      return null;
  }
};
