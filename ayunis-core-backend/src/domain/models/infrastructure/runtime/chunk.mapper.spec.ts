import type { ProviderChunk } from '@ayunis/inference';
import { toStreamChunk } from './chunk.mapper';

describe('toStreamChunk', () => {
  it('maps a text delta', () => {
    const chunk = toStreamChunk({ textDelta: 'hello' });
    expect(chunk.textContentDelta).toBe('hello');
    expect(chunk.thinkingDelta).toBeNull();
    expect(chunk.toolCallsDelta).toEqual([]);
  });

  it('maps thinking deltas with id and signature', () => {
    const chunk = toStreamChunk({
      thinkingDelta: 'pondering',
      thinkingId: 'r1',
      thinkingSignature: 'sig',
    });
    expect(chunk.thinkingDelta).toBe('pondering');
    expect(chunk.thinkingId).toBe('r1');
    expect(chunk.thinkingSignature).toBe('sig');
  });

  it('maps tool call deltas field-by-field', () => {
    const source: ProviderChunk = {
      toolCallDeltas: [
        { index: 0, id: 'call_1', name: 'get_weather', argumentsDelta: '{"a' },
      ],
    };
    const chunk = toStreamChunk(source);
    expect(chunk.toolCallsDelta).toHaveLength(1);
    expect(chunk.toolCallsDelta[0]).toMatchObject({
      index: 0,
      id: 'call_1',
      name: 'get_weather',
      argumentsDelta: '{"a',
    });
  });

  it('maps finish reason and usage through', () => {
    const chunk = toStreamChunk({
      finishReason: 'tool_calls',
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    expect(chunk.finishReason).toBe('tool_calls');
    expect(chunk.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it('defaults absent facets to null/empty', () => {
    const chunk = toStreamChunk({});
    expect(chunk.thinkingDelta).toBeNull();
    expect(chunk.textContentDelta).toBeNull();
    expect(chunk.thinkingId).toBeNull();
    expect(chunk.thinkingSignature).toBeNull();
    expect(chunk.toolCallsDelta).toEqual([]);
    expect(chunk.finishReason).toBeNull();
  });
});
