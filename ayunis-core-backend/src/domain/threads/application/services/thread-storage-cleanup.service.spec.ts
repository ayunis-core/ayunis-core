import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ThreadStorageCleanupService } from './thread-storage-cleanup.service';
import { MESSAGES_REPOSITORY } from 'src/domain/messages/application/ports/messages.repository';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { GeneratedImagesRepository } from '../ports/generated-images.repository';
import { GeneratedImage } from '../../domain/generated-image.entity';
import type { UUID } from 'crypto';

describe('ThreadStorageCleanupService', () => {
  let service: ThreadStorageCleanupService;
  let messagesRepository: { findManyByThreadId: jest.Mock };
  let generatedImagesRepository: jest.Mocked<GeneratedImagesRepository>;
  let deleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;

  const orgId = '123e4567-e89b-12d3-a456-426614174002';
  const threadId = '123e4567-e89b-12d3-a456-426614174001' as any;
  const userId = '123e4567-e89b-12d3-a456-426614174000' as any;

  beforeEach(async () => {
    messagesRepository = {
      findManyByThreadId: jest.fn().mockResolvedValue([]),
    };
    const mockGeneratedImagesRepository = {
      save: jest.fn(),
      findByIdAndThreadId: jest.fn(),
      findManyByThreadId: jest.fn().mockResolvedValue([]),
    };
    const mockDeleteObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreadStorageCleanupService,
        { provide: MESSAGES_REPOSITORY, useValue: messagesRepository },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
        {
          provide: GeneratedImagesRepository,
          useValue: mockGeneratedImagesRepository,
        },
      ],
    }).compile();

    service = module.get(ThreadStorageCleanupService);
    generatedImagesRepository = module.get(GeneratedImagesRepository);
    deleteObjectUseCase = module.get(DeleteObjectUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  const buildImage = (id: UUID, storageKey: string) =>
    new GeneratedImage(
      id,
      orgId,
      userId,
      threadId,
      'image/png',
      false,
      storageKey,
    );

  it('deletes generated-image blobs for the thread', async () => {
    generatedImagesRepository.findManyByThreadId.mockResolvedValue([
      buildImage(
        '00000000-0000-0000-0000-000000000001',
        'generated-images/org/thread/image-1.png',
      ),
      buildImage(
        '00000000-0000-0000-0000-000000000002',
        'generated-images/org/thread/image-2.png',
      ),
    ]);

    await service.cleanupThreadStorage(threadId, orgId);

    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: 'generated-images/org/thread/image-1.png',
      }),
    );
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: 'generated-images/org/thread/image-2.png',
      }),
    );
  });

  it('performs no deletions when the thread has no images', async () => {
    await service.cleanupThreadStorage(threadId, orgId);

    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('continues and logs a warning when a blob delete fails', async () => {
    generatedImagesRepository.findManyByThreadId.mockResolvedValue([
      buildImage(
        '00000000-0000-0000-0000-000000000001',
        'generated-images/org/thread/image-1.png',
      ),
      buildImage(
        '00000000-0000-0000-0000-000000000002',
        'generated-images/org/thread/image-2.png',
      ),
    ]);
    deleteObjectUseCase.execute.mockRejectedValueOnce(
      new Error('storage unavailable'),
    );
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');

    await service.cleanupThreadStorage(threadId, orgId);

    expect(deleteObjectUseCase.execute).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to delete object from storage',
      expect.objectContaining({
        storageKey: 'generated-images/org/thread/image-1.png',
        error: 'storage unavailable',
      }),
    );
  });
});
