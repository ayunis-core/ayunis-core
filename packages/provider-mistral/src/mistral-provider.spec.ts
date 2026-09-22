import { describe, expect, it } from 'vitest';

import { DEFAULT_MAX_TOKENS, mistral } from './mistral-provider';

describe('mistral', () => {
  it('exports the default output-token limit used by requests', () => {
    expect(DEFAULT_MAX_TOKENS).toBe(8_192);
  });

  it('names the provider mistral:<model> and exposes a stream function', () => {
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-large-latest',
    });
    expect(provider.name).toBe('mistral:mistral-large-latest');
    expect(typeof provider.stream).toBe('function');
  });

  it('accepts a custom baseUrl and retry budget', () => {
    const provider = mistral({
      apiKey: 'sk-test',
      model: 'mistral-small-latest',
      baseUrl: 'https://example.test',
      maxRetries: 3,
    });
    expect(provider.name).toBe('mistral:mistral-small-latest');
  });
});
