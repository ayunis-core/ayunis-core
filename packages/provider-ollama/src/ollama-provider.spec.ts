import { describe, expect, it } from 'vitest';

import { ToolNameCodec, type ProviderRequest } from '@ayunis/inference';
import { buildParams, ollama } from './ollama-provider';

describe('ollama', () => {
  it('maps the per-call output-token ceiling', () => {
    const request: ProviderRequest = {
      instructions: '',
      messages: [],
      tools: [],
      maxOutputTokens: 750,
    };

    expect(
      buildParams(
        { baseUrl: 'http://localhost:11434', model: 'llama3.1' },
        request,
        new ToolNameCodec([]),
      ).options,
    ).toMatchObject({ num_predict: 750 });
  });

  it('names the provider ollama:<model> and exposes a stream function', () => {
    const provider = ollama({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1',
    });
    expect(provider.name).toBe('ollama:llama3.1');
    expect(typeof provider.stream).toBe('function');
  });

  it('accepts auth headers and a retry budget', () => {
    const provider = ollama({
      baseUrl: 'https://ollama.example.test',
      model: 'qwen3',
      headers: { Authorization: 'Bearer secret' },
      maxRetries: 3,
    });
    expect(provider.name).toBe('ollama:qwen3');
  });
});
