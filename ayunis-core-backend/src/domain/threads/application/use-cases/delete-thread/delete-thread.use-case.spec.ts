import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DeleteThreadUseCase } from './delete-thread.use-case';
import { DeleteThreadCommand } from './delete-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ThreadNotFoundError } from '../../threads.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { MESSAGES_REPOSITORY } from 'src/domain/messages/application/ports/messages.repository';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';

describe('DeleteThreadUseCase', () => {
  let useCase: DeleteThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
      ],
    }).compile();

    useCase = module.get<DeleteThreadUseCase>(DeleteThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
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

    it('should throw ThreadNotFoundError when thread does not exist', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      threadsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ThreadNotFoundError,
      );

      expect(threadsRepository.findOne).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );
      expect(threadsRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ThreadNotFoundError when thread belongs to different user', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      threadsRepository.findOne.mockResolvedValue(null); // Repository returns null for threads not belonging to user

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ThreadNotFoundError,
      );

      expect(threadsRepository.findOne).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );
      expect(threadsRepository.delete).not.toHaveBeenCalled();
    });

    it('should re-throw ThreadNotFoundError without wrapping', async () => {
      // Arrange
      const command = new DeleteThreadCommand(mockThreadId);

      const threadNotFoundError = new ThreadNotFoundError(
        mockThreadId,
        mockUserId,
      );
      threadsRepository.findOne.mockRejectedValue(threadNotFoundError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ThreadNotFoundError,
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
});
