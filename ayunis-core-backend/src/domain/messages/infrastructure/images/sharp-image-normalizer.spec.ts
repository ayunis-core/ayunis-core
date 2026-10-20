import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { crc32, deflateSync } from 'zlib';
import { MessageContentInvalidError } from 'src/domain/messages/application/messages.errors';
import {
  MAX_IMAGE_LONG_EDGE_PX,
  MAX_IMAGE_SIZE_BYTES,
} from 'src/domain/messages/application/utils/image-upload.policy';
import { SharpImageNormalizer } from './sharp-image-normalizer';

const normalizer = new SharpImageNormalizer();

const noise = (width: number, height: number, channels: 3 | 4 = 3) =>
  sharp(randomBytes(width * height * channels), {
    raw: { width, height, channels },
  });

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function pixelBombPng(width = 20_000, height = 20_000): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.alloc(1024))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('SharpImageNormalizer', () => {
  it('fits a large phone photo within the long edge and the stored-image ceiling', async () => {
    const photo = await noise(4032, 3024).jpeg({ quality: 95 }).toBuffer();
    expect(photo.length).toBeGreaterThan(MAX_IMAGE_SIZE_BYTES);

    const result = await normalizer.normalize({
      buffer: photo,
      contentType: 'image/jpeg',
    });

    const metadata = await sharp(result.buffer).metadata();
    expect(result.contentType).toBe('image/jpeg');
    expect(metadata.format).toBe('jpeg');
    expect(Math.max(metadata.width, metadata.height)).toBe(
      MAX_IMAGE_LONG_EDGE_PX,
    );
    expect(result.buffer.length).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
  });

  it('applies the EXIF orientation and drops EXIF metadata', async () => {
    const photo = await noise(300, 200)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExif({ IFD0: { Copyright: 'GPS-bearing camera data' } })
      .toBuffer();
    expect((await sharp(photo).metadata()).exif).toBeDefined();

    const result = await normalizer.normalize({
      buffer: photo,
      contentType: 'image/jpeg',
    });

    const metadata = await sharp(result.buffer).metadata();
    expect([metadata.width, metadata.height]).toEqual([200, 300]);
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it('does not enlarge a small image', async () => {
    const small = await noise(64, 32).png().toBuffer();

    const result = await normalizer.normalize({
      buffer: small,
      contentType: 'image/png',
    });

    const metadata = await sharp(result.buffer).metadata();
    expect(result.contentType).toBe('image/png');
    expect([metadata.width, metadata.height]).toEqual([64, 32]);
  });

  it('keeps transparency when a downscaled PNG must fall back to WebP', async () => {
    const photo = await noise(1200, 1200, 4).png().toBuffer();
    expect(photo.length).toBeGreaterThan(MAX_IMAGE_SIZE_BYTES);

    const result = await normalizer.normalize({
      buffer: photo,
      contentType: 'image/png',
    });

    const metadata = await sharp(result.buffer).metadata();
    expect(result.contentType).toBe('image/webp');
    expect(metadata.format).toBe('webp');
    expect(metadata.hasAlpha).toBe(true);
    expect(result.buffer.length).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
  });

  it('stores the first frame of a GIF as PNG', async () => {
    const gif = await noise(40, 30).gif().toBuffer();

    const result = await normalizer.normalize({
      buffer: gif,
      contentType: 'image/gif',
    });

    expect(result.contentType).toBe('image/png');
    expect((await sharp(result.buffer).metadata()).format).toBe('png');
  });

  it('rejects an image whose header exceeds the pixel limit before decoding it', async () => {
    await expect(
      normalizer.normalize({
        buffer: pixelBombPng(),
        contentType: 'image/png',
      }),
    ).rejects.toThrow(MessageContentInvalidError);
  });

  it('rejects bytes that cannot be decoded', async () => {
    const corrupt = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      randomBytes(512),
    ]);

    await expect(
      normalizer.normalize({ buffer: corrupt, contentType: 'image/jpeg' }),
    ).rejects.toMatchObject({
      code: 'MESSAGE_CONTENT_INVALID',
      statusCode: 400,
    });
  });

  it('rejects a 51-megapixel header before decoding pixel data', async () => {
    await expect(
      normalizer.normalize({
        buffer: pixelBombPng(10_000, 5100),
        contentType: 'image/png',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      metadata: {
        reason: expect.stringContaining('Input image exceeds pixel limit'),
      },
    });
  });
});
