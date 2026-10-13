import { describe, expect, it, vi } from 'vitest';

import { anthropic } from './anthropic-provider';

vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic {
    messages = { create: vi.fn() };
  },
}));

describe('Anthropic provider limits', () => {
  it('declares the image size and edge limits the API enforces', () => {
    const provider = anthropic({ apiKey: 'test', model: 'claude-test' });

    expect(provider.limits).toEqual({
      image: { maxBase64Bytes: 5 * 1024 * 1024, maxEdgePx: 1568 },
    });
  });
});
