import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from './image-content.service';

const context = {
  orgId: randomUUID(),
  threadId: randomUUID(),
  messageId: randomUUID(),
};

function serviceServing(buffer: Buffer): ImageContentService {
  return new ImageContentService({
    execute: jest.fn().mockResolvedValue(Readable.from([buffer])),
  } as unknown as DownloadObjectUseCase);
}

describe('ImageContentService', () => {
  it('loads the stored bytes with their declared type', async () => {
    const buffer = Buffer.from('stored-bytes');

    await expect(
      serviceServing(buffer).loadImage(
        new ImageMessageContent(0, 'image/png'),
        context,
      ),
    ).resolves.toEqual({ buffer, contentType: 'image/png' });
  });

  it('rejects a stored image over the legacy stored-image limit', async () => {
    await expect(
      serviceServing(Buffer.alloc(10 * 1024 * 1024 + 1)).loadImage(
        new ImageMessageContent(0, 'image/png'),
        context,
      ),
    ).rejects.toMatchObject({ code: 'INFERENCE_FAILED' });
  });
});

it('continues to load a stored image at the legacy 10 MiB boundary', async () => {
  const buffer = Buffer.alloc(10 * 1024 * 1024);
  await expect(
    serviceServing(buffer).loadImage(
      new ImageMessageContent(0, 'image/png'),
      context,
    ),
  ).resolves.toHaveProperty('buffer.length', 10 * 1024 * 1024);
});
it('rejects an unsupported declared MIME type', async () => {
  await expect(
    serviceServing(Buffer.from('bytes')).loadImage(
      new ImageMessageContent(0, 'image/svg+xml'),
      context,
    ),
  ).rejects.toMatchObject({ code: 'INFERENCE_FAILED' });
});
