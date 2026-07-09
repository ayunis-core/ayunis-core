import { describe, expect, it, beforeEach, vi } from 'vitest';

import { DEFAULT_TIMEOUT_MS, mistral } from './mistral-provider';

const mistralCtor = vi.hoisted(() => vi.fn());

vi.mock('@mistralai/mistralai', () => ({ Mistral: mistralCtor }));

beforeEach(() => {
  mistralCtor.mockClear();
});

describe('mistral client construction', () => {
  it('bounds the whole request with the default timeout', () => {
    mistral({ apiKey: 'mistral-key', model: 'mistral-large-latest' });

    expect(mistralCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: DEFAULT_TIMEOUT_MS }),
    );
  });

  it('lets the host override the timeout', () => {
    mistral({
      apiKey: 'mistral-key',
      model: 'mistral-large-latest',
      timeoutMs: 60_000,
    });

    expect(mistralCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 60_000 }),
    );
  });
});
