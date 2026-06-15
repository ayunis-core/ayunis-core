import { describe, expect, it } from 'vitest';

import { azure, openai } from './openai-provider';

describe('openai', () => {
  it('names the provider openai:<model> and exposes a stream function', () => {
    const provider = openai({ apiKey: 'sk-test', model: 'gpt-4.1' });
    expect(provider.name).toBe('openai:gpt-4.1');
    expect(typeof provider.stream).toBe('function');
  });

  it('accepts a custom baseUrl (OpenAI-compatible endpoint)', () => {
    const provider = openai({
      apiKey: 'sk-test',
      model: 'llama-3.3-70b',
      baseUrl: 'https://api.scaleway.ai/v1',
    });
    expect(provider.name).toBe('openai:llama-3.3-70b');
  });
});

describe('azure', () => {
  it('names the provider azure:<deployment> and exposes a stream function', () => {
    const provider = azure({
      apiKey: 'azure-test',
      endpoint: 'https://my-resource.openai.azure.com',
      apiVersion: '2024-10-21',
      model: 'gpt-4o-deployment',
    });
    expect(provider.name).toBe('azure:gpt-4o-deployment');
    expect(typeof provider.stream).toBe('function');
  });
});
