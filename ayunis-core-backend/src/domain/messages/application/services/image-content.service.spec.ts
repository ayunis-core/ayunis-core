import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import sharp from 'sharp';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { PROVIDER_IMAGE_BASE64_LIMIT_BYTES } from 'src/domain/messages/application/utils/fit-image-to-provider-limit.util';
import { ImageContentService } from './image-content.service';

const context = {
  orgId: '123e4567-e89b-12d3-a456-426614174000',
  threadId: '223e4567-e89b-12d3-a456-426614174000',
  messageId: '323e4567-e89b-12d3-a456-426614174000',
};

function serviceServing(buffer: Buffer): ImageContentService {
  return new ImageContentService({
    execute: jest.fn().mockResolvedValue(Readable.from([buffer])),
  } as unknown as DownloadObjectUseCase);
}

describe('ImageContentService', () => {
  it('sends a stored image within the provider limit as stored', async () => {
    const buffer = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();

    const result = await serviceServing(buffer).convertImageToBase64(
      new ImageMessageContent(0, 'image/png'),
      context,
    );

    expect(result).toEqual({
      base64: buffer.toString('base64'),
      contentType: 'image/png',
    });
  });

  it('keeps a stored image as stored when the provider allows its size', async () => {
    const buffer = await sharp(randomBytes(2400 * 1200 * 3), {
      raw: { width: 2400, height: 1200, channels: 3 },
    })
      .png()
      .toBuffer();

    const result = await serviceServing(buffer).convertImageToBase64(
      new ImageMessageContent(0, 'image/png'),
      context,
      { maxBase64Bytes: 20 * 1024 * 1024, maxEdgePx: 2048 },
    );

    expect(result).toEqual({
      base64: buffer.toString('base64'),
      contentType: 'image/png',
    });
  });

  it('shrinks a stored image over the provider limit before sending it', async () => {
    const buffer = await sharp(randomBytes(2400 * 1200 * 3), {
      raw: { width: 2400, height: 1200, channels: 3 },
    })
      .png()
      .toBuffer();

    const result = await serviceServing(buffer).convertImageToBase64(
      new ImageMessageContent(0, 'image/png'),
      context,
    );

    expect(result.contentType).toBe('image/jpeg');
    expect(result.base64.length).toBeLessThanOrEqual(
      PROVIDER_IMAGE_BASE64_LIMIT_BYTES,
    );
  });
});
