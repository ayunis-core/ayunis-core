import { describe, expect, it } from 'vitest';

import { ChunkAccumulator } from './accumulator';

describe('ChunkAccumulator', () => {
  it('reassembles tool arguments split across deltas', () => {
    const accumulator = new ChunkAccumulator();
    accumulator.accept({
      toolCallDeltas: [{ index: 0, id: 'c1', name: 'search' }],
    });
    accumulator.accept({
      toolCallDeltas: [{ index: 0, argumentsDelta: '{"query":' }],
    });
    accumulator.accept({
      toolCallDeltas: [{ index: 0, argumentsDelta: '"agents"}' }],
    });

    const { message } = accumulator.finalize();
    expect(message.content).toEqual([
      {
        type: 'tool_use',
        id: 'c1',
        name: 'search',
        input: { query: 'agents' },
      },
    ]);
  });

  it('accumulates multiple parallel tool calls by index', () => {
    const accumulator = new ChunkAccumulator();
    accumulator.accept({
      toolCallDeltas: [
        { index: 1, id: 'c2', name: 'second', argumentsDelta: '{"b":2}' },
        { index: 0, id: 'c1', name: 'first', argumentsDelta: '{"a":1}' },
      ],
    });

    const { message } = accumulator.finalize();
    expect(message.content.map((c) => ('name' in c ? c.name : null))).toEqual([
      'first',
      'second',
    ]);
  });

  it('falls back to an empty object for malformed argument JSON', () => {
    const accumulator = new ChunkAccumulator();
    accumulator.accept({
      toolCallDeltas: [
        { index: 0, id: 'c1', name: 'broken', argumentsDelta: '{"a": ' },
      ],
    });

    const { message } = accumulator.finalize();
    expect(message.content[0]).toMatchObject({ input: {} });
  });

  it('assembles thinking with id and an accumulated signature', () => {
    const accumulator = new ChunkAccumulator();
    accumulator.accept({ thinkingDelta: 'Let me ', thinkingId: 'rs_1' });
    accumulator.accept({ thinkingDelta: 'think.', thinkingSignature: 'sig-a' });
    accumulator.accept({ thinkingSignature: 'sig-b' });
    accumulator.accept({ textDelta: 'Answer' });

    const { message } = accumulator.finalize();
    expect(message.content[0]).toEqual({
      type: 'thinking',
      thinking: 'Let me think.',
      id: 'rs_1',
      signature: 'sig-asig-b',
    });
    expect(message.content[1]).toEqual({ type: 'text', text: 'Answer' });
  });

  it('round-trips provider metadata on text and tool calls', () => {
    const accumulator = new ChunkAccumulator();
    accumulator.accept({
      textDelta: 'Hi',
      textProviderMetadata: { gemini: { thoughtSignature: 'ts-1' } },
    });
    accumulator.accept({
      toolCallDeltas: [
        {
          index: 0,
          id: 'c1',
          name: 'tool',
          argumentsDelta: '{}',
          providerMetadata: { gemini: { thoughtSignature: 'ts-2' } },
        },
      ],
    });

    const { message } = accumulator.finalize();
    expect(message.content[0]).toMatchObject({
      providerMetadata: { gemini: { thoughtSignature: 'ts-1' } },
    });
    expect(message.content[1]).toMatchObject({
      providerMetadata: { gemini: { thoughtSignature: 'ts-2' } },
    });
  });

  it('keeps the latest defined usage fields and finish reason', () => {
    const accumulator = new ChunkAccumulator();
    accumulator.accept({ usage: { inputTokens: 100 } });
    accumulator.accept({ textDelta: 'Hi' });
    accumulator.accept({ finishReason: 'stop', usage: { outputTokens: 7 } });

    const result = accumulator.finalize();
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 7 });
    expect(result.finishReason).toBe('stop');
  });

  it('produces an empty content array when nothing streamed', () => {
    const accumulator = new ChunkAccumulator();

    const { message } = accumulator.finalize();
    expect(message).toEqual({ role: 'assistant', content: [] });
  });
});
