import { describe, expect, it } from 'vitest';
import type { ChatResponse, Message } from 'ollama';

import { ToolNameCodec } from '@ayunis/inference';

import { convertChunk as convert } from './convert-chunk';

// Passthrough map — name translation is covered by its own tests below.
const convertChunk = (c: ChatResponse) => convert(c, new ToolNameCodec([]));

const chunk = (
  message: Partial<Message>,
  done: Partial<ChatResponse> = {},
): ChatResponse =>
  ({
    model: 'llama3.1',
    message: { role: 'assistant', content: '', ...message },
    done: false,
    ...done,
  }) as unknown as ChatResponse;

describe('convertChunk', () => {
  it('maps native thinking to a thinking delta', () => {
    const result = convertChunk(chunk({ thinking: 'reasoning' }));
    expect(result).toEqual({ thinkingDelta: 'reasoning' });
  });

  it('forwards content verbatim as a text delta', () => {
    const result = convertChunk(chunk({ content: 'Hello' }));
    expect(result).toEqual({ textDelta: 'Hello' });
  });

  it('preserves inline <think> tags in the text delta', () => {
    const result = convertChunk(chunk({ content: '<think>x</think>hi' }));
    expect(result?.textDelta).toBe('<think>x</think>hi');
  });

  it('maps tool calls to tool call deltas', () => {
    const result = convertChunk(
      chunk({
        tool_calls: [
          { function: { name: 'get_weather', arguments: { city: 'Berlin' } } },
        ],
      }),
    );
    expect(result?.toolCallDeltas).toHaveLength(1);
    expect(result?.toolCallDeltas?.[0]).toMatchObject({
      index: 0,
      name: 'get_weather',
      argumentsDelta: JSON.stringify({ city: 'Berlin' }),
    });
    expect(result?.toolCallDeltas?.[0].id).toBeTruthy();
  });

  it('assigns a distinct index to each parallel tool call', () => {
    const result = convertChunk(
      chunk({
        tool_calls: [
          { function: { name: 'get_weather', arguments: { city: 'Berlin' } } },
          { function: { name: 'get_time', arguments: { city: 'Paris' } } },
        ],
      }),
    );
    expect(result?.toolCallDeltas?.map((d) => d.index)).toEqual([0, 1]);
  });

  it('emits finish reason and usage on the final chunk', () => {
    const result = convertChunk(
      chunk(
        { content: 'done' },
        {
          done: true,
          done_reason: 'stop',
          prompt_eval_count: 12,
          eval_count: 34,
        },
      ),
    );
    expect(result).toMatchObject({
      textDelta: 'done',
      finishReason: 'stop',
      usage: { inputTokens: 12, outputTokens: 34 },
    });
  });

  it('returns null for an empty, non-final chunk', () => {
    expect(convertChunk(chunk({}))).toBeNull();
  });
});

describe('convertChunk wire-name decoding', () => {
  it('maps a wire tool name back to the original and records the wire name', () => {
    const codec = new ToolNameCodec([
      { name: 'notion.search', description: 'd', parameters: {} },
    ]);
    const result = convert(
      chunk({
        tool_calls: [
          { function: { name: 'notion_search', arguments: { q: 'x' } } },
        ],
      }),
      codec,
    );
    const delta = result?.toolCallDeltas?.[0];
    expect(delta).toMatchObject({
      name: 'notion.search',
      argumentsDelta: '{"q":"x"}',
      providerMetadata: { wireName: 'notion_search' },
    });
  });
});
