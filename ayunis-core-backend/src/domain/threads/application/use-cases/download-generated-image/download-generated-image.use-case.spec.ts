import type { UUID } from 'crypto';
import { Readable } from 'stream';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import type { GeneratedImagesRepository } from 'src/domain/threads/application/ports/generated-images.repository';
import {
  ThreadNotFoundError,
  GeneratedImageNotFoundError,
  UnsupportedImageContentTypeError,
} from 'src/domain/threads/application/threads.errors';
import { GeneratedImage } from 'src/domain/threads/domain/generated-image.entity';
import { DownloadGeneratedImageUseCase } from './download-generated-image.use-case';
import { DownloadGeneratedImageQuery } from './download-generated-image.query';

describe('DownloadGeneratedImageUseCase', () => {
  let useCase: DownloadGeneratedImageUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let generatedImagesRepository: jest.Mocked<GeneratedImagesRepository>;
  let downloadObjectUseCase: jest.Mocked<DownloadObjectUseCase>;

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const threadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const imageId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const orgId = '123e4567-e89b-12d3-a456-426614174003' as UUID;
  const storageKey = `generated-images/${orgId}/${threadId}/${imageId}.png`;

  function buildImage(contentType = 'image/png'): GeneratedImage {
    return new GeneratedImage(
      imageId,
      orgId,
      userId,
      threadId,
      contentType,
      false,
      storageKey,
    );
  }

  const query = () =>
    new DownloadGeneratedImageQuery(threadId, imageId, userId);

  beforeEach(() => {
    threadsRepository = {
      findOne: jest.fn(),
      existsForUser: jest.fn(),
    } as unknown as jest.Mocked<ThreadsRepository>;
    generatedImagesRepository = {
      findByIdAndThreadId: jest.fn(),
    } as unknown as jest.Mocked<GeneratedImagesRepository>;
    downloadObjectUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DownloadObjectUseCase>;

    useCase = new DownloadGeneratedImageUseCase(
      threadsRepository,
      generatedImagesRepository,
      downloadObjectUseCase,
    );
  });

  it('streams the image of an owned thread with its stored content type', async () => {
    const stream = new Readable();
    threadsRepository.existsForUser.mockResolvedValue(true);
    generatedImagesRepository.findByIdAndThreadId.mockResolvedValue(
      buildImage(),
    );
    downloadObjectUseCase.execute.mockResolvedValue(stream);

    const result = await useCase.execute(query());

    expect(result).toEqual({
      stream,
      contentType: 'image/png',
      filename: `${imageId}.png`,
    });
    expect(threadsRepository.existsForUser).toHaveBeenCalledWith(
      threadId,
      userId,
    );
    expect(threadsRepository.findOne).not.toHaveBeenCalled();
    expect(generatedImagesRepository.findByIdAndThreadId).toHaveBeenCalledWith(
      imageId,
      threadId,
    );
    expect(downloadObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: storageKey }),
    );
  });

  it('throws ThreadNotFoundError when the user does not own the thread', async () => {
    threadsRepository.existsForUser.mockResolvedValue(false);

    await expect(useCase.execute(query())).rejects.toThrow(ThreadNotFoundError);
    expect(
      generatedImagesRepository.findByIdAndThreadId,
    ).not.toHaveBeenCalled();
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws GeneratedImageNotFoundError when the image is not in the thread', async () => {
    threadsRepository.existsForUser.mockResolvedValue(true);
    generatedImagesRepository.findByIdAndThreadId.mockResolvedValue(null);

    await expect(useCase.execute(query())).rejects.toThrow(
      GeneratedImageNotFoundError,
    );
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('refuses to serve a stored content type outside the image allow-list', async () => {
    threadsRepository.existsForUser.mockResolvedValue(true);
    generatedImagesRepository.findByIdAndThreadId.mockResolvedValue(
      buildImage('image/svg+xml'),
    );

    await expect(useCase.execute(query())).rejects.toThrow(
      UnsupportedImageContentTypeError,
    );
    expect(downloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('passes through ObjectNotFoundError when the blob is missing', async () => {
    threadsRepository.existsForUser.mockResolvedValue(true);
    generatedImagesRepository.findByIdAndThreadId.mockResolvedValue(
      buildImage(),
    );
    downloadObjectUseCase.execute.mockRejectedValue(
      new ObjectNotFoundError({ objectName: storageKey }),
    );

    await expect(useCase.execute(query())).rejects.toThrow(ObjectNotFoundError);
  });
});
