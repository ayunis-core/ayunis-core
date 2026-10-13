import { randomBytes } from 'crypto';
import sharp from 'sharp';
import {
  fitImageToProviderLimit,
  PROVIDER_IMAGE_BASE64_LIMIT_BYTES,
  PROVIDER_IMAGE_MAX_EDGE_PX,
} from './fit-image-to-provider-limit.util';

function noiseImage(width: number, height: number, channels: 3 | 4) {
  return sharp(randomBytes(width * height * channels), {
    raw: { width, height, channels },
  });
}

const base64Length = (buffer: Buffer) => buffer.toString('base64').length;

describe('fitImageToProviderLimit', () => {
  it('passes an image within the provider limit through unchanged', async () => {
    const buffer = await noiseImage(64, 64, 3).png().toBuffer();

    const result = await fitImageToProviderLimit(buffer, 'image/png');

    expect(result).toEqual({ buffer, contentType: 'image/png' });
  });

  it('shrinks an oversized photo below the provider limit as JPEG', async () => {
    const buffer = await noiseImage(2400, 1200, 3).png().toBuffer();
    expect(base64Length(buffer)).toBeGreaterThan(
      PROVIDER_IMAGE_BASE64_LIMIT_BYTES,
    );

    const result = await fitImageToProviderLimit(buffer, 'image/png');

    expect(result.contentType).toBe('image/jpeg');
    expect(base64Length(result.buffer)).toBeLessThanOrEqual(
      PROVIDER_IMAGE_BASE64_LIMIT_BYTES,
    );
    const { width, height } = await sharp(result.buffer).metadata();
    expect(Math.max(width, height)).toBe(PROVIDER_IMAGE_MAX_EDGE_PX);
    expect(width / height).toBeCloseTo(2, 1);
  });

  it('keeps transparency when shrinking an oversized image with alpha', async () => {
    const buffer = await noiseImage(2000, 1000, 4).png().toBuffer();
    expect(base64Length(buffer)).toBeGreaterThan(
      PROVIDER_IMAGE_BASE64_LIMIT_BYTES,
    );

    const result = await fitImageToProviderLimit(buffer, 'image/png');

    expect(result.contentType).toBe('image/webp');
    expect(base64Length(result.buffer)).toBeLessThanOrEqual(
      PROVIDER_IMAGE_BASE64_LIMIT_BYTES,
    );
    expect((await sharp(result.buffer).metadata()).hasAlpha).toBe(true);
  });

  it('refuses to decode an oversized image whose frame exceeds the pixel budget', async () => {
    const hugeFrame = await sharp({
      create: { width: 9000, height: 8000, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    // Bytes after the PNG end chunk are ignored by decoders but push the
    // stored object over the provider limit, so the shrink path runs.
    const buffer = Buffer.concat([
      hugeFrame,
      randomBytes(PROVIDER_IMAGE_BASE64_LIMIT_BYTES),
    ]);

    await expect(
      fitImageToProviderLimit(buffer, 'image/png'),
    ).rejects.toMatchObject({ code: 'INFERENCE_IMAGE_TOO_LARGE' });
  });

  it('refuses oversized bytes that carry no allowed raster signature', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    );
    const buffer = Buffer.concat([
      svg,
      randomBytes(PROVIDER_IMAGE_BASE64_LIMIT_BYTES),
    ]);

    await expect(
      fitImageToProviderLimit(buffer, 'image/png'),
    ).rejects.toMatchObject({ code: 'MESSAGE_IMAGE_UNSUPPORTED' });
  });

  it('reports an oversized image it cannot decode as too large', async () => {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const buffer = Buffer.concat([
      pngSignature,
      randomBytes(PROVIDER_IMAGE_BASE64_LIMIT_BYTES),
    ]);

    await expect(
      fitImageToProviderLimit(buffer, 'image/png'),
    ).rejects.toMatchObject({ code: 'INFERENCE_IMAGE_TOO_LARGE' });
  });
});
