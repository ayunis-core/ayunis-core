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
    expect(estimator.countText('Guten Morgen, Bürgerbüro!')).toBeGreaterThan(4);
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
