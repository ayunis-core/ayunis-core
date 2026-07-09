import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';

import { convertChunk } from './convert-chunk';

const event = (value: unknown): Anthropic.Messages.MessageStreamEvent =>
  value as Anthropic.Messages.MessageStreamEvent;

describe('convertChunk', () => {
  it('converts message_start to input usage', () => {
    expect(
      convertChunk(
        event({
          type: 'message_start',
          message: { usage: { input_tokens: 123 } },
        }),
      ),
    ).toEqual({ usage: { inputTokens: 123 } });
  });

  it('passes prompt-cache token counts through message_start usage', () => {
    expect(
      convertChunk(
        event({
          type: 'message_start',
          message: {
            usage: {
              input_tokens: 3,
              cache_creation_input_tokens: 9677,
              cache_read_input_tokens: 0,
            },
          },
        }),
      ),
    ).toEqual({
      usage: {
        inputTokens: 3,
        cacheWriteInputTokens: 9677,
        cacheReadInputTokens: 0,
      },
    });
  });

  it('converts text deltas', () => {
    expect(
      convertChunk(
        event({
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Hello' },
        }),
      ),
    ).toEqual({ textDelta: 'Hello' });
  });

  it('converts thinking and signature deltas', () => {
    expect(
      convertChunk(
        event({
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'thinking_delta', thinking: 'Hmm' },
        }),
      ),
    ).toEqual({ thinkingDelta: 'Hmm' });
    expect(
      convertChunk(
        event({
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'signature_delta', signature: 'sig-1' },
        }),
      ),
    ).toEqual({ thinkingSignature: 'sig-1' });
  });

  it('converts tool_use block starts to id/name deltas', () => {
    expect(
      convertChunk(
        event({
          type: 'content_block_start',
          index: 1,
          content_block: { type: 'tool_use', id: 'toolu_1', name: 'search' },
        }),
      ),
    ).toEqual({
      toolCallDeltas: [{ index: 1, id: 'toolu_1', name: 'search' }],
    });
  });

  it('converts input_json deltas to argument deltas', () => {
    expect(
      convertChunk(
        event({
          type: 'content_block_delta',
          index: 1,
          delta: { type: 'input_json_delta', partial_json: '{"q":' },
        }),
      ),
    ).toEqual({ toolCallDeltas: [{ index: 1, argumentsDelta: '{"q":' }] });
  });

  it.each([
    ['end_turn', 'stop'],
    ['stop_sequence', 'stop'],
    ['max_tokens', 'length'],
    ['tool_use', 'tool_calls'],
    ['refusal', null],
    [null, null],
  ])('maps stop reason %s to %s', (stopReason, finishReason) => {
    expect(
      convertChunk(
        event({
          type: 'message_delta',
          delta: { stop_reason: stopReason },
          usage: { output_tokens: 7 },
        }),
      ),
    ).toEqual({ finishReason, usage: { outputTokens: 7 } });
  });

  it('returns null for events without content', () => {
    expect(convertChunk(event({ type: 'message_stop' }))).toBeNull();
    expect(
      convertChunk(
        event({
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'thinking' },
        }),
      ),
    ).toBeNull();
    expect(
      convertChunk(event({ type: 'content_block_stop', index: 0 })),
    ).toBeNull();
  });
});
