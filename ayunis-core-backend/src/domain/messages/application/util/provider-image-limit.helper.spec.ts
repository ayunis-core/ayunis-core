import { bedrockImageLimits } from '@ayunis/provider-anthropic';
import {
  MAX_IMAGE_SIZE_BYTES,
  strictestImageBytes,
} from './provider-image-limit.helper';

describe('provider image limit', () => {
  it('takes the smallest limit any provider declares', () => {
    expect(
      strictestImageBytes([
        { maxImageBytes: 30 },
        { maxImageBytes: 10 },
        { maxImageBytes: 20 },
      ]),
    ).toBe(10);
  });

  it('bounds uploads by the Bedrock limit, the strictest provider', () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(bedrockImageLimits.maxImageBytes);
    expect(MAX_IMAGE_SIZE_BYTES).toBe(3_932_160);
  });
});
