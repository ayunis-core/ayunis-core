import { describe, expect, it } from 'vitest';
import { generatedImageIdFromToolResult } from './generated-image-id';

const imageId = '4f3a1c2e-8b7d-4e6a-9c1f-2a6b8d0e4f71';

describe('generatedImageIdFromToolResult', () => {
  it('returns a plain image id unchanged', () => {
    expect(generatedImageIdFromToolResult(imageId)).toBe(imageId);
  });

  it('keeps the image id when the tool result explains that transparency was not applied', () => {
    const result = `${imageId}\nTransparency was not applied because this image model does not support transparent backgrounds.`;

    expect(generatedImageIdFromToolResult(result)).toBe(imageId);
  });

  it('leaves a non-id result unchanged', () => {
    expect(generatedImageIdFromToolResult(undefined)).toBeUndefined();
    expect(generatedImageIdFromToolResult('generation failed')).toBe(
      'generation failed',
    );
  });
});
