import { describe, expect, it } from 'vitest';

import { gemini } from './gemini-provider';

describe('gemini', () => {
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
