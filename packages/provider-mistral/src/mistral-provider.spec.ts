import { describe, expect, it } from 'vitest';

import { ToolNameCodec, type ProviderRequest } from '@ayunis/inference';
import { buildParams, mistral } from './mistral-provider';

describe('mistral', () => {
  it('maps the per-call output-token ceiling', () => {
    const request: ProviderRequest = {
      instructions: '',
      messages: [],
      tools: [],
      maxOutputTokens: 750,
    };

    expect(
      buildParams('mistral-large-latest', request, new ToolNameCodec([]))
        .maxTokens,
    ).toBe(750);
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
