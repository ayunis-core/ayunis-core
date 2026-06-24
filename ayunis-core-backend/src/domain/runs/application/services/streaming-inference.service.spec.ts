import { StreamingInferenceService } from './streaming-inference.service';
import { StreamInferenceResponseChunk } from 'src/domain/models/application/ports/stream-inference.handler';

describe('StreamingInferenceService.extractUsageFromChunks', () => {
  // extractUsageFromChunks is a pure method that does not touch `this`, so we
  // can exercise it without wiring up the service's dependencies.
  const service = new StreamingInferenceService(
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
  );

  const chunkWithUsage = (usage: {
    inputTokens?: number;
    outputTokens?: number;
  }): StreamInferenceResponseChunk =>
    new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [],
      usage,
    });

  it('returns undefined when no chunk carries usage', () => {
    expect(
      service.extractUsageFromChunks([
        StreamInferenceResponseChunk.text('a'),
        StreamInferenceResponseChunk.text('b'),
      ]),
    ).toBeUndefined();
  });

  it('takes last-wins instead of summing cumulative per-chunk usage', () => {
    // Providers (e.g. Gemini, Mistral) report cumulative usage on every chunk.
    // Summing would over-count; the final values are the truth.
    const usage = service.extractUsageFromChunks([
      chunkWithUsage({ inputTokens: 100, outputTokens: 10 }),
      chunkWithUsage({ inputTokens: 100, outputTokens: 25 }),
      chunkWithUsage({ inputTokens: 100, outputTokens: 42 }),
    ]);
    expect(usage).toEqual({ inputTokens: 100, outputTokens: 42 });
  });

  it('carries forward the last defined value of each field independently', () => {
    // Gemini repeats promptTokenCount on every chunk but only emits
    // candidatesTokenCount on the final chunk.
    const usage = service.extractUsageFromChunks([
      chunkWithUsage({ inputTokens: 100 }),
      chunkWithUsage({ inputTokens: 100 }),
      chunkWithUsage({ inputTokens: 100, outputTokens: 30 }),
    ]);
    expect(usage).toEqual({ inputTokens: 100, outputTokens: 30 });
  });
});
