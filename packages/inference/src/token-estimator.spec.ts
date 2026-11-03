import { get_encoding } from 'tiktoken';
import { describe, expect, it } from 'vitest';

import {
  createTiktokenEstimator,
  DEFAULT_TOKENS_PER_IMAGE,
  estimatedTokens,
} from './token-estimator';

const tool = {
  name: 'search',
  description: 'Search the knowledge base',
  parameters: { type: 'object', properties: { q: { type: 'string' } } },
};

describe('estimatedTokens', () => {
  const estimator = estimatedTokens();

  it('is an estimate with the default image cost and no message framing', () => {
    expect(estimator).toMatchObject({
      exact: false,
      tokensPerMessage: 0,
      tokensPerImage: DEFAULT_TOKENS_PER_IMAGE,
    });
  });

  it('counts text with cl100k_base and empty text as nothing', () => {
    expect(estimator.countText('hello world')).toBe(2);
    expect(estimator.countText('')).toBe(0);
  });

  it('counts tool definitions by their schema and nothing without tools', () => {
    expect(estimator.countTools([])).toBe(0);
    expect(estimator.countTools([tool])).toBeGreaterThan(10);
  });
});

describe('createTiktokenEstimator', () => {
  it('counts with the requested encoding', () => {
    const text = 'Antrag auf Wohngeld für die Gemeinde Musterstadt '.repeat(20);
    const o200k = createTiktokenEstimator({
      encoding: 'o200k_base',
      exact: true,
      tokensPerMessage: 3,
      tokensPerImage: 1,
    });

    expect(o200k.countText(text)).toBeGreaterThan(0);
    expect(o200k.countText(text)).not.toBe(estimatedTokens().countText(text));
    expect(o200k).toMatchObject({ exact: true, tokensPerMessage: 3 });
  });
});

describe('literal tokenizer markers', () => {
  it.each(['cl100k_base', 'o200k_base'] as const)(
    'counts special-token spellings as ordinary text with %s',
    (encoding) => {
      const estimator = createTiktokenEstimator({
        encoding,
        exact: true,
        tokensPerMessage: 3,
        tokensPerImage: 1,
      });
      expect(
        estimator.countText('Please explain <|endoftext|>'),
      ).toBeGreaterThan(0);
      expect(
        estimator.countTools([{ ...tool, description: '<|endoftext|>' }]),
      ).toBeGreaterThan(0);
    },
  );
});

describe('long unsplittable runs', () => {
  const runs = {
    spaces: ' '.repeat(100_000),
    newlines: '\n'.repeat(100_000),
    dashes: '-'.repeat(100_000),
    letters: 'x'.repeat(100_000),
  };

  const timed = (count: () => number): { tokens: number; ms: number } => {
    const start = performance.now();
    const tokens = count();
    return { tokens, ms: performance.now() - start };
  };

  it.each(['cl100k_base', 'o200k_base'] as const)(
    'counts 100k-char runs without blocking with %s',
    (encoding) => {
      const estimator = createTiktokenEstimator({
        encoding,
        exact: true,
        tokensPerMessage: 3,
        tokensPerImage: 1,
      });
      for (const run of Object.values(runs)) {
        const text = `Bericht der Verwaltung ${run} Ende`;
        const { tokens, ms } = timed(() => estimator.countText(text));
        expect(ms).toBeLessThan(250);
        expect(tokens).toBeGreaterThan(0);
      }
    },
  );

  it.each(['cl100k_base', 'o200k_base'] as const)(
    'counts ordinary text exactly as one encode does with %s',
    (encoding) => {
      const estimator = createTiktokenEstimator({
        encoding,
        exact: true,
        tokensPerMessage: 3,
        tokensPerImage: 1,
      });
      const exact = get_encoding(encoding);
      const text =
        "Die Gemeinde plant den Haushalt neu.\n\n| a | b |\n|---|---|\nDon't  stop: https://example.org/a?b=1 😀 日本語 Straße 2026.\n".repeat(
          500,
        );
      expect(estimator.countText(text)).toBe(exact.encode(text, [], []).length);
      exact.free();
    },
  );

  it('scales linearly on text with no cut points', () => {
    const estimator = estimatedTokens();
    const small = timed(() => estimator.countText('x'.repeat(1_000_000))).ms;
    const large = timed(() => estimator.countText('x'.repeat(4_000_000))).ms;
    expect(large / small).toBeLessThan(8);
  });

  const mark = String.fromCodePoint(0x301);
  const nextLine = String.fromCodePoint(0x85);
  const astral = String.fromCodePoint(0x10137);
  const pathological = {
    'letters with combining marks': `a${mark}`.repeat(50_000),
    'marks then letters': `${mark.repeat(1_001)}${'x'.repeat(100_000)}`,
    'next-line and spaces': `${nextLine} `.repeat(50_000),
    'BPE-sensitive forced cuts': `ssue${'z'.repeat(991)}takes`.repeat(20),
    'astral symbols across a cut': `${'.'.repeat(999)}${astral.repeat(5_000)}`,
    'a long whitespace run': `Bericht ${' '.repeat(40_000)} Ende`,
    'CJK without spaces':
      '市町村は来年度の予算計画を見直し、住民サービスの改善を進める方針です。'.repeat(
        400,
      ),
    'Thai without spaces':
      'เทศบาลวางแผนงบประมาณสำหรับปีหน้าเพื่อปรับปรุงบริการประชาชน'.repeat(400),
  };

  describe.each(['cl100k_base', 'o200k_base'] as const)(
    'with %s',
    (encoding) => {
      const estimator = createTiktokenEstimator({
        encoding,
        exact: true,
        tokensPerMessage: 3,
        tokensPerImage: 1,
      });

      it.each(Object.entries(pathological))(
        'counts %s without blocking',
        (_label, text) => {
          expect(timed(() => estimator.countText(text)).ms).toBeLessThan(250);
        },
      );

      // A forced cut can shift BPE merges either way; the budget's safety ratio
      // covers the fraction-of-a-percent shortfall, not a large overcount.
      it.each(Object.entries(pathological))(
        'counts %s close to one encode',
        (_label, run) => {
          const text = run.slice(0, 20_000);
          const exact = get_encoding(encoding);
          const whole = exact.encode(text, [], []).length;
          exact.free();
          const counted = estimator.countText(text);
          expect(counted).toBeGreaterThanOrEqual(Math.floor(whole * 0.99));
          expect(counted).toBeLessThanOrEqual(Math.ceil(whole * 1.3));
        },
      );
    },
  );

  it('does not slow down on many runs just under the split threshold', () => {
    const estimator = estimatedTokens();
    const text = `${' '.repeat(999)}a`.repeat(200);
    expect(timed(() => estimator.countText(text)).ms).toBeLessThan(250);
  });
});
