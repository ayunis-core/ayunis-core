import { describe, expect, it } from 'vitest';

import { DEFAULT_NUM_CTX, DEFAULT_NUM_PREDICT, ollama } from './index';

describe('ollama', () => {
  it('exports the default context window used by requests', () => {
    expect(DEFAULT_NUM_CTX).toBe(30_000);
  });

  it('exports the default output-token limit used by requests', () => {
    expect(DEFAULT_NUM_PREDICT).toBe(8_192);
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
