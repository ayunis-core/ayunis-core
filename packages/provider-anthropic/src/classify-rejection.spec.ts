import { describe, expect, it } from 'vitest';

import { classifyAnthropicRejection } from './classify-rejection';

describe('classifyAnthropicRejection', () => {
  it('reports the overflow when the provider states both token counts', () => {
    expect(
      classifyAnthropicRejection({
        error: {
          error: {
            message: 'prompt is too long: 210950 tokens > 200000 maximum',
          },
        },
      }),
    ).toEqual({
      reason: 'context_length_exceeded',
      contextOverflowTokens: 10_950,
    });
  });

  it('recognises the wording without token counts', () => {
    expect(
      classifyAnthropicRejection(new Error('400 prompt is too long')),
    ).toEqual({ reason: 'context_length_exceeded' });
  });

  it('leaves other invalid requests unclassified', () => {
    expect(
      classifyAnthropicRejection(new Error('messages: roles must alternate')),
    ).toBeUndefined();
  });
});
