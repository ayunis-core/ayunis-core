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

it('preserves token counts from a structured body behind a generic wrapper', () => {
  expect(
    classifyAnthropicRejection({
      message: '400 prompt is too long',
      error: { message: 'prompt is too long: 210950 tokens > 200000 maximum' },
    }),
  ).toEqual({
    reason: 'context_length_exceeded',
    contextOverflowTokens: 10950,
  });
});
it.each([null, undefined, {}, 'unrelated'])(
  'ignores unrelated input %s',
  (error) => {
    expect(classifyAnthropicRejection(error)).toBeUndefined();
  },
);
it('recognises an oversized image', () => {
  expect(
    classifyAnthropicRejection(
      new Error('image exceeds 5 MB maximum: 9052272 bytes > 5242880 bytes'),
    ),
  ).toEqual({ reason: 'image_too_large' });
});
it.each([
  '100 tokens > 200 maximum',
  '200 tokens > 200 maximum',
  '999999999999999999999 tokens > 1 maximum',
])('omits unusable overflow counts: %s', (counts) => {
  expect(
    classifyAnthropicRejection(new Error(`prompt is too long: ${counts}`)),
  ).toEqual({ reason: 'context_length_exceeded' });
});
