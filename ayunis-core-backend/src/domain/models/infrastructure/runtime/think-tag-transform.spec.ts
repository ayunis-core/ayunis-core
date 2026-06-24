import type { ProviderChunk } from '@ayunis/inference';
import { createThinkTagChunkTransform } from './think-tag-transform';

describe('createThinkTagChunkTransform', () => {
  it('splits inline <think> reasoning out of text deltas', () => {
    const transform = createThinkTagChunkTransform();

    const opening = transform({ textDelta: '<think>reasoning' });
    expect(opening.thinkingDelta).toBe('reasoning');
    expect(opening.textDelta).toBeNull();

    const closing = transform({ textDelta: '</think>answer' });
    expect(closing.thinkingDelta).toBeNull();
    expect(closing.textDelta).toBe('answer');
  });

  it('leaves plain text untouched', () => {
    const transform = createThinkTagChunkTransform();
    expect(transform({ textDelta: 'just text' })).toMatchObject({
      textDelta: 'just text',
      thinkingDelta: null,
    });
  });

  it('passes through chunks without text deltas unchanged', () => {
    const transform = createThinkTagChunkTransform();
    const chunk: ProviderChunk = { finishReason: 'stop', usage: {} };
    expect(transform(chunk)).toBe(chunk);
  });

  it('keeps separate parser state per transform instance', () => {
    const a = createThinkTagChunkTransform();
    a({ textDelta: '<think>still open' });
    // A fresh transform must not inherit the first one's open-thinking state.
    const b = createThinkTagChunkTransform();
    expect(b({ textDelta: 'plain' })).toMatchObject({ textDelta: 'plain' });
  });
});
