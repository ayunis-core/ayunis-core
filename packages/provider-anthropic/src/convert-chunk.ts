import type Anthropic from '@anthropic-ai/sdk';

import type {
  FinishReason,
  ProviderChunk,
  ToolNameCodec,
} from '@ayunis/inference';

/**
 * Converts one Anthropic stream event to a provider-agnostic chunk.
 * Returns null for events that carry nothing (ping, block stops).
 */
export const convertChunk = (
  event: Anthropic.Messages.MessageStreamEvent,
  codec: ToolNameCodec,
): ProviderChunk | null => {
  switch (event.type) {
    case 'content_block_delta':
      return convertContentBlockDelta(event);
    case 'content_block_start':
      return convertContentBlockStart(event, codec);
    case 'message_start':
      return {
        usage: { inputTokens: event.message.usage.input_tokens },
      };
    case 'message_delta':
      return {
        finishReason: mapStopReason(event.delta.stop_reason),
        usage: { outputTokens: event.usage.output_tokens },
      };
    case 'message_stop':
    case 'content_block_stop':
      return null;
  }
};

const convertContentBlockDelta = (
  event: Anthropic.Messages.ContentBlockDeltaEvent,
): ProviderChunk | null => {
  switch (event.delta.type) {
    case 'thinking_delta':
      return { thinkingDelta: event.delta.thinking };
    case 'signature_delta':
      return { thinkingSignature: event.delta.signature };
    case 'text_delta':
      return { textDelta: event.delta.text };
    case 'input_json_delta':
      return {
        toolCallDeltas: [
          { index: event.index, argumentsDelta: event.delta.partial_json },
        ],
      };
    case 'citations_delta':
      return null;
  }
};

const convertContentBlockStart = (
  event: Anthropic.Messages.ContentBlockStartEvent,
  codec: ToolNameCodec,
): ProviderChunk | null => {
  if (event.content_block.type !== 'tool_use') {
    return null;
  }
  const wireName = event.content_block.name;
  const name = codec.decode(wireName);
  return {
    toolCallDeltas: [
      {
        index: event.index,
        id: event.content_block.id,
        name,
        // Record what the model actually saw when names were translated.
        ...(name !== wireName ? { providerMetadata: { wireName } } : {}),
      },
    ],
  };
};

const mapStopReason = (
  reason: Anthropic.Messages.MessageDeltaEvent['delta']['stop_reason'],
): FinishReason => {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    case 'pause_turn':
    case 'refusal':
    case null:
    default:
      return null;
  }
};
