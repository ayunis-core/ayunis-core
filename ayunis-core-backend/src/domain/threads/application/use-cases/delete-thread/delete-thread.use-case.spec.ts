import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DeleteThreadUseCase } from './delete-thread.use-case';
import { DeleteThreadCommand } from './delete-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadStorageCleanupService } from '../../services/thread-storage-cleanup.service';

describe('DeleteThreadUseCase', () => {
  let useCase: DeleteThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let threadStorageCleanupService: jest.Mocked<ThreadStorageCleanupService>;

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

    const mockThreadStorageCleanupService = {
      cleanupThreadStorage: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: ThreadStorageCleanupService,
          useValue: mockThreadStorageCleanupService,
        },
      ],
    }).compile();

    useCase = module.get<DeleteThreadUseCase>(DeleteThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);
    threadStorageCleanupService = module.get(ThreadStorageCleanupService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const existingThread = {
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should clean up storage then delete the thread when it exists', async () => {
      threadsRepository.findOne.mockResolvedValue(existingThread as any);
      threadsRepository.delete.mockResolvedValue(undefined);

      await useCase.execute(new DeleteThreadCommand(mockThreadId));

      expect(
        threadStorageCleanupService.cleanupThreadStorage,
      ).toHaveBeenCalledWith(mockThreadId, mockOrgId);
      expect(threadsRepository.delete).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );
    });

    it('should succeed silently and skip cleanup when the thread does not exist', async () => {
      threadsRepository.findOne.mockResolvedValue(null);

      await useCase.execute(new DeleteThreadCommand(mockThreadId));

      expect(
        threadStorageCleanupService.cleanupThreadStorage,
      ).not.toHaveBeenCalled();
      expect(threadsRepository.delete).not.toHaveBeenCalled();
    });

    it('should propagate repository errors during deletion', async () => {
      threadsRepository.findOne.mockResolvedValue(existingThread as any);
      threadsRepository.delete.mockRejectedValue(
        new Error('Database connection failed'),
      );
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(
        useCase.execute(new DeleteThreadCommand(mockThreadId)),
      ).rejects.toThrow('Database connection failed');

      expect(errorSpy).toHaveBeenCalledWith('Failed to delete thread', {
        threadId: mockThreadId,
        userId: mockUserId,
        error: 'Database connection failed',
      });
    });
  });
});
