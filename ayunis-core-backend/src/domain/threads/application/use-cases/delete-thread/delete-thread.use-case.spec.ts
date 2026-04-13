import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DeleteThreadUseCase } from './delete-thread.use-case';
import { DeleteThreadCommand } from './delete-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { MESSAGES_REPOSITORY } from 'src/domain/messages/application/ports/messages.repository';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { GeneratedImagesRepository } from '../../ports/generated-images.repository';
import { GeneratedImage } from '../../../domain/generated-image.entity';

describe('DeleteThreadUseCase', () => {
  let useCase: DeleteThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let deleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;
  let generatedImagesRepository: jest.Mocked<GeneratedImagesRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174002' as any;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as any;

  beforeEach(async () => {
    const mockThreadsRepository = {
      findOne: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockMessagesRepository = {
      findManyByThreadId: jest.fn().mockResolvedValue([]),
    };

    const mockDeleteObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const mockGeneratedImagesRepository = {
      findByThreadId: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
        {
          provide: GeneratedImagesRepository,
          useValue: mockGeneratedImagesRepository,
        },
      ],
    }).compile();

    useCase = module.get<DeleteThreadUseCase>(DeleteThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);
    deleteObjectUseCase = module.get(DeleteObjectUseCase);
    generatedImagesRepository = module.get(GeneratedImagesRepository);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should delete thread successfully when thread exists', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      const mockThread = {
        id: mockThreadId,
        userId: mockUserId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      threadsRepository.findOne.mockResolvedValue(mockThread as any);
      threadsRepository.delete.mockResolvedValue(undefined);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(threadsRepository.findOne).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );
      expect(threadsRepository.delete).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );

      expect(logSpy).toHaveBeenCalledWith('delete', {
        threadId: mockThreadId,
      });
      expect(logSpy).toHaveBeenCalledWith('Thread deleted successfully', {
        threadId: mockThreadId,
        userId: mockUserId,
      });
    });

    it('should succeed silently when thread does not exist (idempotent delete)', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      threadsRepository.findOne.mockResolvedValue(null);

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      await useCase.execute(command);

      // Assert
      expect(threadsRepository.findOne).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );
      expect(threadsRepository.delete).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        'Thread already deleted or not found, treating as success',
        {
          threadId: mockThreadId,
          userId: mockUserId,
        },
      );
    });

    it('should succeed silently when thread belongs to different user (idempotent delete)', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      threadsRepository.findOne.mockResolvedValue(null); // Repository returns null for threads not belonging to user

      // Act
      await useCase.execute(command);

      // Assert
      expect(threadsRepository.findOne).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );
      expect(threadsRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle repository errors during deletion', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      const mockThread = {
        id: mockThreadId,
        userId: mockUserId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      threadsRepository.findOne.mockResolvedValue(mockThread as any);

      const repositoryError = new Error('Database connection failed');
      threadsRepository.delete.mockRejectedValue(repositoryError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );

      expect(threadsRepository.findOne).toHaveBeenCalled();
      expect(threadsRepository.delete).toHaveBeenCalled();

      expect(errorSpy).toHaveBeenCalledWith('Failed to delete thread', {
        threadId: mockThreadId,
        userId: mockUserId,
        error: 'Database connection failed',
      });
    });

    it('should handle unknown error types during deletion', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      const mockThread = {
        id: mockThreadId,
        userId: mockUserId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      threadsRepository.findOne.mockResolvedValue(mockThread as any);
      threadsRepository.delete.mockRejectedValue('string error');

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toBeDefined();

      expect(errorSpy).toHaveBeenCalledWith('Failed to delete thread', {
        threadId: mockThreadId,
        userId: mockUserId,
        error: 'Unknown error',
      });
    });

    it('should log initial delete request', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      const mockThread = {
        id: mockThreadId,
        userId: mockUserId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      threadsRepository.findOne.mockResolvedValue(mockThread as any);
      threadsRepository.delete.mockResolvedValue(undefined);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('delete', {
        threadId: mockThreadId,
      });
    });
  });

  describe('deleteGeneratedImageStorage', () => {
    const mockThread = {
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      threadsRepository.findOne.mockResolvedValue(mockThread as any);
      threadsRepository.delete.mockResolvedValue(undefined);
    });

    it('should delete storage for each generated image in the thread', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      const generatedImages = [
        new GeneratedImage(
          '123e4567-e89b-12d3-a456-426614174010' as any,
          mockOrgId,
          mockUserId,
          mockThreadId,
          'image/png',
          false,
          'orgs/org-1/generated/image-1.png',
        ),
        new GeneratedImage(
          '123e4567-e89b-12d3-a456-426614174011' as any,
          mockOrgId,
          mockUserId,
          mockThreadId,
          'image/png',
          false,
          'orgs/org-1/generated/image-2.png',
        ),
      ];

      generatedImagesRepository.findByThreadId.mockResolvedValue(
        generatedImages,
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(generatedImagesRepository.findByThreadId).toHaveBeenCalledWith(
        mockThreadId,
      );
      expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
        new DeleteObjectCommand('orgs/org-1/generated/image-1.png'),
      );
      expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
        new DeleteObjectCommand('orgs/org-1/generated/image-2.png'),
      );
    });

    it('should continue deletion when storage object is already gone (ObjectNotFoundError)', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      const generatedImages = [
        new GeneratedImage(
          '123e4567-e89b-12d3-a456-426614174010' as any,
          mockOrgId,
          mockUserId,
          mockThreadId,
          'image/png',
          false,
          'orgs/org-1/generated/missing-image.png',
        ),
      ];

      generatedImagesRepository.findByThreadId.mockResolvedValue(
        generatedImages,
      );
      deleteObjectUseCase.execute.mockRejectedValue(
        new ObjectNotFoundError({
          objectName: 'orgs/org-1/generated/missing-image.png',
        }),
      );

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      await useCase.execute(command);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        'Generated image not found in storage, skipping',
        {
          threadId: mockThreadId,
          storageKey: 'orgs/org-1/generated/missing-image.png',
        },
      );
      expect(threadsRepository.delete).toHaveBeenCalled();
    });

    it('should log warning and continue when an unexpected error occurs during generated image deletion', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      const generatedImages = [
        new GeneratedImage(
          '123e4567-e89b-12d3-a456-426614174010' as any,
          mockOrgId,
          mockUserId,
          mockThreadId,
          'image/png',
          false,
          'orgs/org-1/generated/error-image.png',
        ),
      ];

      generatedImagesRepository.findByThreadId.mockResolvedValue(
        generatedImages,
      );
      deleteObjectUseCase.execute.mockRejectedValue(
        new Error('S3 connection timeout'),
      );

      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      await useCase.execute(command);

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to delete generated image from storage',
        {
          threadId: mockThreadId,
          storageKey: 'orgs/org-1/generated/error-image.png',
          error: 'S3 connection timeout',
        },
      );
      expect(threadsRepository.delete).toHaveBeenCalled();
    });
  });
});
