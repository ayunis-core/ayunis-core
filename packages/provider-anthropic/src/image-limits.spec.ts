import { describe, expect, it } from 'vitest';

import { anthropicImageLimits, bedrockImageLimits } from './image-limits';

describe('image limits', () => {
  it('keeps a Claude API image within 10 MiB of base64', () => {
    expect(anthropicImageLimits.maxImageBytes).toBe(7_864_320);
  });

  it('keeps a Bedrock image within the 5 MiB of base64 it rejected in production', () => {
    const base64Length = Buffer.alloc(
      bedrockImageLimits.maxImageBytes,
    ).toString('base64').length;

    expect(bedrockImageLimits.maxImageBytes).toBe(3_932_160);
    expect(base64Length).toBeLessThanOrEqual(5_242_880);
  });
});
