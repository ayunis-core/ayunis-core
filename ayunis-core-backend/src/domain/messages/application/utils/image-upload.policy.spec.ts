import { bedrockImageLimits } from '@ayunis/provider-anthropic';
import { MAX_IMAGE_SIZE_BYTES } from './image-upload.policy';

describe('provider image limit', () => {
  it('bounds uploads by the Bedrock limit, the strictest provider', () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(bedrockImageLimits.maxImageBytes);
    expect(MAX_IMAGE_SIZE_BYTES).toBe(3_932_160);
  });
});
