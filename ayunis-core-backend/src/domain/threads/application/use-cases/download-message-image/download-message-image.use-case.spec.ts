import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Readable } from 'stream';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { ThreadsRepository } from '../../ports/threads.repository';
import {
  MessageImageNotFoundError,
  ThreadNotFoundError,
  UnexpecteThreadError,
  UnsupportedImageContentTypeError,
} from '../../threads.errors';
import { DownloadMessageImageUseCase } from './download-message-image.use-case';
import { DownloadMessageImageQuery } from './download-message-image.query';

describe('DownloadMessageImageUseCase', () => {
  let useCase: DownloadMessageImageUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let downloadObjectUseCase: jest.Mocked<DownloadObjectUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const userId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const threadId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const messageId = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  function buildThread(contentType = 'image/png'): Thread {
    const message = new UserMessage({
      id: messageId,
      threadId,
      content: [new ImageMessageContent(0, contentType, 'alt')],
    });
    return { id: threadId, messages: [message] } as unknown as Thread;
  }

  beforeEach(() => {
    threadsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ThreadsRepository>;
    downloadObjectUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DownloadObjectUseCase>;
    contextService = {
      get: jest.fn().mockReturnValue(orgId),
    } as unknown as jest.Mocked<ContextService>;

    useCase = new DownloadMessageImageUseCase(
      contextService,
      threadsRepository,
      downloadObjectUseCase,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('streams the image for an owned thread', async () => {
    const mockStream = new Readable();
    threadsRepository.findOne.mockResolvedValue(buildThread());
    downloadObjectUseCase.execute.mockResolvedValue(mockStream);

    const result = await useCase.execute(
      new DownloadMessageImageQuery(threadId, messageId, 0, userId),
    );

    expect(result.stream).toBe(mockStream);
    expect(result.contentType).toBe('image/png');
    expect(result.filename).toBe('0.png');
    expect(threadsRepository.findOne).toHaveBeenCalledWith(threadId, userId);
    expect(downloadObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: `${orgId}/${threadId}/${messageId}/0.png`,
      }),
    );
  });

  it('throws ThreadNotFoundError when the thread is not owned by the user', async () => {
    threadsRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new DownloadMessageImageQuery(threadId, messageId, 0, userId),
      ),
    ).rejects.toThrow(ThreadNotFoundError);
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws MessageImageNotFoundError when the message is not in the thread', async () => {
    threadsRepository.findOne.mockResolvedValue(buildThread());
    const otherMessageId = '123e4567-e89b-12d3-a456-426614174009' as UUID;

    await expect(
      useCase.execute(
        new DownloadMessageImageQuery(threadId, otherMessageId, 0, userId),
      ),
    ).rejects.toThrow(MessageImageNotFoundError);
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws MessageImageNotFoundError when no image content exists at the index', async () => {
    threadsRepository.findOne.mockResolvedValue(buildThread());

    await expect(
      useCase.execute(
        new DownloadMessageImageQuery(threadId, messageId, 5, userId),
      ),
    ).rejects.toThrow(MessageImageNotFoundError);
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws UnsupportedImageContentTypeError for a disallowed content type', async () => {
    threadsRepository.findOne.mockResolvedValue(buildThread('image/svg+xml'));

    await expect(
      useCase.execute(
        new DownloadMessageImageQuery(threadId, messageId, 0, userId),
      ),
    ).rejects.toThrow(UnsupportedImageContentTypeError);
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedAccessError when no orgId is in the context', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(
        new DownloadMessageImageQuery(threadId, messageId, 0, userId),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(threadsRepository.findOne).not.toHaveBeenCalled();
  });

  it('propagates ObjectNotFoundError from the download', async () => {
    threadsRepository.findOne.mockResolvedValue(buildThread());
    downloadObjectUseCase.execute.mockRejectedValue(
      new ObjectNotFoundError({ objectName: 'x' }),
    );

    await expect(
      useCase.execute(
        new DownloadMessageImageQuery(threadId, messageId, 0, userId),
      ),
    ).rejects.toThrow(ObjectNotFoundError);
  });

  it('wraps unexpected errors in UnexpecteThreadError', async () => {
    threadsRepository.findOne.mockRejectedValue(new TypeError('boom'));

    await expect(
      useCase.execute(
        new DownloadMessageImageQuery(threadId, messageId, 0, userId),
      ),
    ).rejects.toThrow(UnexpecteThreadError);
  });
});
