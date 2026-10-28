import { estimatedTokens } from '@ayunis/inference';
import { describe, expect, it } from 'vitest';

import {
  compatibleEndpointTokens,
  openAITokens,
  openAITokensPerImage,
} from './openai-tokens';

const text = 'Antrag auf Wohngeld für die Gemeinde Musterstadt '.repeat(20);

describe('openAITokens', () => {
  it.each(['gpt-5.6-sol', 'gpt-4o-mini', 'gpt-4.1', 'o3-deployment'])(
    'counts %s with o200k_base, exactly, with message framing',
    (model) => {
      const estimator = openAITokens(model);

      expect(estimator).toMatchObject({ exact: true, tokensPerMessage: 3 });
      expect(estimator.countText(text)).not.toBe(
        estimatedTokens().countText(text),
      );
    },
  );

  it.each(['gpt-4-turbo', 'gpt-3.5-turbo'])(
    'counts %s with cl100k_base',
    (model) => {
      expect(openAITokens(model).countText(text)).toBe(
        estimatedTokens().countText(text),
      );
    },
  );

  it('exposes the per-model image ceiling', () => {
    expect(openAITokens('gpt-4o-mini').tokensPerImage).toBe(
      openAITokensPerImage('gpt-4o-mini'),
    );
  });
});

describe('openAITokensPerImage', () => {
  it.each([
    ['gpt-4o-mini', 48_169],
    ['gpt-4o-mini-2024-07-18', 48_169],
    ['gpt-4o', 1_445],
    ['gpt-4.1', 1_445],
    ['gpt-4-turbo', 1_445],
    ['gpt-4.1-mini', 9_954],
    ['gpt-4.1-nano', 15_115],
    ['o4-mini', 10_568],
    ['o1', 1_275],
    ['o3-pro', 1_275],
    ['gpt-5', 1_190],
    ['gpt-5.1', 1_190],
    ['gpt-5-mini', 7_373],
    ['gpt-5-nano', 9_216],
    ['gpt-5.2', 7_373],
    ['gpt-5.4-mini', 3_000],
    ['gpt-5.5', 3_000],
    ['gpt-5.6-sol', 3_000],
    ['gpt-6-astra', 3_000],
  ])(
    "prices a high-detail image on %s at OpenAI's ceiling of %i",
    (model, tokens) => {
      expect(openAITokensPerImage(model)).toBe(tokens);
    },
  );

  it('over-counts an unrecognised deployment name', () => {
    expect(openAITokensPerImage('sol')).toBeGreaterThanOrEqual(
      openAITokensPerImage('gpt-4o-mini'),
    );
    expect(openAITokensPerImage('chat-prod')).toBeGreaterThanOrEqual(
      openAITokensPerImage('gpt-4.1-nano'),
    );
  });

  it('keeps six GPT-4o mini images out of a 128k window', () => {
    expect(6 * openAITokensPerImage('gpt-4o-mini')).toBeGreaterThan(128_000);
  });
});

describe('compatibleEndpointTokens', () => {
  it('is the shared estimate, not an exact tokenizer', () => {
    const estimator = compatibleEndpointTokens();

    expect(estimator.exact).toBe(false);
    expect(estimator.countText(text)).toBe(estimatedTokens().countText(text));
    expect(estimator.tokensPerImage).toBe(estimatedTokens().tokensPerImage);
  });
});

it('does not advertise an unknown deployment tokenizer as exact', () => {
  expect(openAITokens('chat-prod').exact).toBe(false);
});
