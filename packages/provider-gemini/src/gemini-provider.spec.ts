import { describe, expect, it } from 'vitest';

import type { ProviderRequest } from '@ayunis/inference';
import { buildGenerationConfig, gemini } from './gemini-provider';

describe('gemini', () => {
  it('maps the per-call output-token ceiling', () => {
    const request: ProviderRequest = {
      instructions: '',
      messages: [],
      tools: [],
      maxOutputTokens: 750,
    };

    expect(buildGenerationConfig(request)).toMatchObject({
      maxOutputTokens: 750,
    });
  });

  it('names the provider gemini:<model> and exposes a stream function', () => {
    const provider = gemini({ apiKey: 'sk-test', model: 'gemini-2.5-pro' });
    expect(provider.name).toBe('gemini:gemini-2.5-pro');
    expect(typeof provider.stream).toBe('function');
  });

  it('accepts a retry budget', () => {
    const provider = gemini({
      apiKey: 'sk-test',
      model: 'gemini-2.5-flash',
      maxRetries: 3,
    });
    expect(provider.name).toBe('gemini:gemini-2.5-flash');
  });
});
