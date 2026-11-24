import { randomUUID } from 'node:crypto';
import { get_encoding } from 'tiktoken';
import { describe, expect, it, vi } from 'vitest';

import { countWithCache } from './token-count-cache';
import { createTiktokenEstimator } from './token-estimator';

const longText = (): string =>
  `${randomUUID()} ${'Der Gemeinderat prüft den Antrag auf Förderung. '.repeat(100)}`;

describe('countWithCache', () => {
  it('tokenizes a repeated long text only once', () => {
    const count = vi.fn((text: string) => text.length);
    const text = longText();

    countWithCache('cl100k_base', text, count);
    countWithCache('cl100k_base', text, count);

    expect(count).toHaveBeenCalledTimes(1);
  });

  it('recounts a long text once its content changes', () => {
    const count = vi.fn((text: string) => text.length);
    const text = longText();

    countWithCache('cl100k_base', text, count);
    const edited = countWithCache('cl100k_base', `${text} Ergänzung`, count);

    expect(count).toHaveBeenCalledTimes(2);
    expect(edited).toBe(text.length + ' Ergänzung'.length);
  });

  it('does not serve a count cached under another encoding', () => {
    const options = { exact: true, tokensPerMessage: 3, tokensPerImage: 1 };
    const cl100k = createTiktokenEstimator({
      ...options,
      encoding: 'cl100k_base',
    });
    const o200k = createTiktokenEstimator({
      ...options,
      encoding: 'o200k_base',
    });
    const text = longText();
    const exact = get_encoding('o200k_base');
    const expected = exact.encode(text, [], []).length;
    exact.free();

    cl100k.countText(text);

    expect(o200k.countText(text)).toBe(expected);
    expect(o200k.countText(text)).not.toBe(cl100k.countText(text));
  });
});
