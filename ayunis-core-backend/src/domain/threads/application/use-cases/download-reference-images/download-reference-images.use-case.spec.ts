import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { DownloadReferenceImagesUseCase } from './download-reference-images.use-case';
import type { UploadedImageRef } from './download-reference-images.query';
import { DownloadReferenceImagesQuery } from './download-reference-images.query';
import type { ThreadsRepository } from '../../ports/threads.repository';
import type { GeneratedImagesRepository } from '../../ports/generated-images.repository';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  GeneratedImageNotFoundError,
  MessageImageNotFoundError,
  ThreadNotFoundError,
  UnsupportedImageContentTypeError,
} from '../../threads.errors';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { GeneratedImage } from 'src/domain/threads/domain/generated-image.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';

describe('DownloadReferenceImagesUseCase', () => {
  let useCase: DownloadReferenceImagesUseCase;
  let contextService: jest.Mocked<ContextService>;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let generatedImagesRepository: jest.Mocked<GeneratedImagesRepository>;
  let downloadObjectUseCase: jest.Mocked<DownloadObjectUseCase>;

  const orgId = randomUUID();
  const userId = randomUUID();
  const threadId = randomUUID();

  beforeEach(() => {
    contextService = {
      get: jest.fn().mockReturnValue(orgId),
    } as unknown as jest.Mocked<ContextService>;
    threadsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ThreadsRepository>;
    generatedImagesRepository = {
      findByIdAndThreadId: jest.fn(),
    } as unknown as jest.Mocked<GeneratedImagesRepository>;
    downloadObjectUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DownloadObjectUseCase>;

    useCase = new DownloadReferenceImagesUseCase(
      contextService,
      threadsRepository,
      generatedImagesRepository,
      downloadObjectUseCase,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildThread(messages: UserMessage[] = []): Thread {
    return new Thread({ id: threadId, userId, messages });
  }

  function buildImageMessage(imageCount: number, createdAt: Date): UserMessage {
    const contents = Array.from(
      { length: imageCount },
      (_, index) => new ImageMessageContent(index, 'image/png'),
    );
    return new UserMessage({
      threadId,
      createdAt,
      content: [new TextMessageContent('Recreate this scan'), ...contents],
    });
  }

  function refTo(message: UserMessage, index: number): UploadedImageRef {
    return { messageId: message.id, index };
  }

  function stubDownloadWithPathEcho(): void {
    downloadObjectUseCase.execute.mockImplementation((command) =>
      Promise.resolve(Readable.from([Buffer.from(command.objectName)])),
    );
  }

  function query(
    overrides: Partial<{
      uploadedImageRefs: UploadedImageRef[];
      generatedImageIds: UUID[];
    }> = {},
  ): DownloadReferenceImagesQuery {
    return new DownloadReferenceImagesQuery({
      threadId,
      userId,
      uploadedImageRefs: overrides.uploadedImageRefs ?? [],
      generatedImageIds: overrides.generatedImageIds ?? [],
    });
  }

  it('should throw UnauthorizedAccessError when orgId is missing from context', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(useCase.execute(query())).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw ThreadNotFoundError when the thread does not belong to the user', async () => {
    threadsRepository.findOne.mockResolvedValue(null);

    await expect(useCase.execute(query())).rejects.toThrow(ThreadNotFoundError);
  });

  it('should download a generated image by ID from its storage key', async () => {
    threadsRepository.findOne.mockResolvedValue(buildThread());
    const imageId = randomUUID();
    generatedImagesRepository.findByIdAndThreadId.mockResolvedValue(
      new GeneratedImage(
        imageId,
        orgId,
        userId,
        threadId,
        'image/png',
        false,
        'generated-images/org/thread/image.png',
      ),
    );
    stubDownloadWithPathEcho();

    const result = await useCase.execute(
      query({ generatedImageIds: [imageId] }),
    );

    expect(generatedImagesRepository.findByIdAndThreadId).toHaveBeenCalledWith(
      imageId,
      threadId,
    );
    expect(result).toEqual([
      {
        data: Buffer.from('generated-images/org/thread/image.png'),
        contentType: 'image/png',
      },
    ]);
  });

  it('should throw GeneratedImageNotFoundError for an ID not in the thread', async () => {
    threadsRepository.findOne.mockResolvedValue(buildThread());
    generatedImagesRepository.findByIdAndThreadId.mockResolvedValue(null);

    await expect(
      useCase.execute(query({ generatedImageIds: [randomUUID()] })),
    ).rejects.toThrow(GeneratedImageNotFoundError);
  });

  it('should download the referenced uploaded images from their storage paths', async () => {
    const message = buildImageMessage(2, new Date('2026-08-01T10:00:00Z'));
    threadsRepository.findOne.mockResolvedValue(buildThread([message]));
    stubDownloadWithPathEcho();

    const result = await useCase.execute(
      query({ uploadedImageRefs: [refTo(message, 0), refTo(message, 1)] }),
    );

    expect(result).toEqual([
      {
        data: Buffer.from(`${orgId}/${threadId}/${message.id}/0.png`),
        contentType: 'image/png',
      },
      {
        data: Buffer.from(`${orgId}/${threadId}/${message.id}/1.png`),
        contentType: 'image/png',
      },
    ]);
  });

  it('should return uploaded images in the order they were referenced', async () => {
    const older = buildImageMessage(1, new Date('2026-08-01T10:00:00Z'));
    const newer = buildImageMessage(1, new Date('2026-08-02T10:00:00Z'));
    threadsRepository.findOne.mockResolvedValue(buildThread([older, newer]));
    stubDownloadWithPathEcho();

    const result = await useCase.execute(
      query({ uploadedImageRefs: [refTo(older, 0), refTo(newer, 0)] }),
    );

    expect(result.map((image) => image.data.toString())).toEqual([
      `${orgId}/${threadId}/${older.id}/0.png`,
      `${orgId}/${threadId}/${newer.id}/0.png`,
    ]);
  });

  it('should only download the referenced image, not other thread uploads', async () => {
    const referenced = buildImageMessage(1, new Date('2026-08-01T10:00:00Z'));
    const other = buildImageMessage(1, new Date('2026-08-02T10:00:00Z'));
    threadsRepository.findOne.mockResolvedValue(
      buildThread([referenced, other]),
    );
    stubDownloadWithPathEcho();

    const result = await useCase.execute(
      query({ uploadedImageRefs: [refTo(referenced, 0)] }),
    );

    expect(result.map((image) => image.data.toString())).toEqual([
      `${orgId}/${threadId}/${referenced.id}/0.png`,
    ]);
    expect(downloadObjectUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should not download uploaded images when none are referenced', async () => {
    const message = buildImageMessage(1, new Date('2026-08-01T10:00:00Z'));
    threadsRepository.findOne.mockResolvedValue(buildThread([message]));

    const result = await useCase.execute(query());

    expect(result).toEqual([]);
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw MessageImageNotFoundError for a ref to an unknown message', async () => {
    threadsRepository.findOne.mockResolvedValue(buildThread());

    await expect(
      useCase.execute(
        query({ uploadedImageRefs: [{ messageId: randomUUID(), index: 0 }] }),
      ),
    ).rejects.toThrow(MessageImageNotFoundError);
  });

  it('should throw MessageImageNotFoundError for an out-of-range image index', async () => {
    const message = buildImageMessage(1, new Date('2026-08-01T10:00:00Z'));
    threadsRepository.findOne.mockResolvedValue(buildThread([message]));

    await expect(
      useCase.execute(query({ uploadedImageRefs: [refTo(message, 3)] })),
    ).rejects.toThrow(MessageImageNotFoundError);
  });

  it('should throw UnsupportedImageContentTypeError for a ref to an image type the edit API rejects', async () => {
    const message = new UserMessage({
      threadId,
      createdAt: new Date('2026-08-01T10:00:00Z'),
      content: [new ImageMessageContent(0, 'image/gif')],
    });
    threadsRepository.findOne.mockResolvedValue(buildThread([message]));

    await expect(
      useCase.execute(query({ uploadedImageRefs: [refTo(message, 0)] })),
    ).rejects.toThrow(UnsupportedImageContentTypeError);
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should skip images larger than the 10 MB reference limit', async () => {
    const message = buildImageMessage(2, new Date('2026-08-01T10:00:00Z'));
    threadsRepository.findOne.mockResolvedValue(buildThread([message]));
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1);
    downloadObjectUseCase.execute
      .mockResolvedValueOnce(Readable.from([oversized]))
      .mockResolvedValueOnce(Readable.from([Buffer.from('small-image')]));

    const result = await useCase.execute(
      query({ uploadedImageRefs: [refTo(message, 0), refTo(message, 1)] }),
    );

    expect(result).toEqual([
      { data: Buffer.from('small-image'), contentType: 'image/png' },
    ]);
  });

  it('should cap combined references at 16 images, preferring generated ones', async () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      buildImageMessage(4, new Date(`2026-08-0${i + 1}T10:00:00Z`)),
    );
    threadsRepository.findOne.mockResolvedValue(buildThread(messages));
    const uploadedImageRefs = messages.flatMap((message) =>
      message.content
        .filter((c) => c instanceof ImageMessageContent)
        .map((c) => refTo(message, c.index)),
    );
    const generatedIds = [randomUUID(), randomUUID()] as UUID[];
    generatedImagesRepository.findByIdAndThreadId.mockImplementation((id) =>
      Promise.resolve(
        new GeneratedImage(
          id,
          orgId,
          userId,
          threadId,
          'image/png',
          false,
          `generated-images/${id}.png`,
        ),
      ),
    );
    stubDownloadWithPathEcho();

    const result = await useCase.execute(
      query({ uploadedImageRefs, generatedImageIds: generatedIds }),
    );

    expect(result).toHaveLength(16);
    expect(result[0].data.toString()).toBe(
      `generated-images/${generatedIds[0]}.png`,
    );
    expect(result[1].data.toString()).toBe(
      `generated-images/${generatedIds[1]}.png`,
    );
  });
});
