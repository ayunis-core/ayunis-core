import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import { describe, expect, it } from 'vitest';

import { convertChunk } from './convert-chunk';

const chunk = (value: unknown): ChatCompletionChunk =>
  value as ChatCompletionChunk;

describe('convertChunk', () => {
  it('converts a text content delta', () => {
    expect(
      convertChunk(
        chunk({ choices: [{ delta: { content: 'Hello' }, index: 0 }] }),
      ),
    ).toEqual({ textDelta: 'Hello' });
  });

  it('converts tool_call deltas, carrying id, name and arguments', () => {
    expect(
      convertChunk(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_1',
                    function: { name: 'search', arguments: '{"q":' },
                  },
                ],
              },
            },
          ],
        }),
      ),
    ).toEqual({
      toolCallDeltas: [
        { index: 0, id: 'call_1', name: 'search', argumentsDelta: '{"q":' },
      ],
    });
  });

  it('defaults missing tool_call fields to null', () => {
    expect(
      convertChunk(
        chunk({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [{ index: 0, function: { arguments: 'ents"}' } }],
              },
            },
          ],
        }),
      ),
    ).toEqual({
      toolCallDeltas: [
        { index: 0, id: null, name: null, argumentsDelta: 'ents"}' },
      ],
    });
  });

  it.each([
    ['stop', 'stop'],
    ['content_filter', 'stop'],
    ['length', 'length'],
    ['tool_calls', 'tool_calls'],
    ['function_call', 'tool_calls'],
  ])('maps finish_reason %s to %s', (finishReason, expected) => {
    expect(
      convertChunk(
        chunk({
          choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
        }),
      ),
    ).toEqual({ finishReason: expected });
  });

  it('converts a trailing usage-only chunk', () => {
    expect(
      convertChunk(
        chunk({
          choices: [],
          usage: { prompt_tokens: 11, completion_tokens: 22 },
        }),
      ),
    ).toEqual({ usage: { inputTokens: 11, outputTokens: 22 } });
  });

  it('returns null for an empty delta chunk', () => {
    expect(
      convertChunk(chunk({ choices: [{ index: 0, delta: {} }] })),
    ).toBeNull();
  });
});
