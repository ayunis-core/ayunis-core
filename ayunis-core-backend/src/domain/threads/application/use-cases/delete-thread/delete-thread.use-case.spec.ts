import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { DeleteThreadUseCase } from './delete-thread.use-case';
import { DeleteThreadCommand } from './delete-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';

describe('DeleteThreadUseCase', () => {
  let useCase: DeleteThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let purgeStoragePrefixesUseCase: { execute: jest.Mock };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;

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

    purgeStoragePrefixesUseCase = {
      execute: jest.fn().mockResolvedValue({ deletedCount: 0, failedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: PurgeStoragePrefixesUseCase,
          useValue: purgeStoragePrefixesUseCase,
        },
      ],
    }).compile();

    useCase = module.get<DeleteThreadUseCase>(DeleteThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);

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

    it('should delete the thread row before purging its storage prefixes', async () => {
      threadsRepository.findOne.mockResolvedValue(existingThread as never);
      const callOrder: string[] = [];
      threadsRepository.delete.mockImplementation(() => {
        callOrder.push('delete');
        return Promise.resolve(undefined);
      });
      purgeStoragePrefixesUseCase.execute.mockImplementation(() => {
        callOrder.push('purge');
        return Promise.resolve({ deletedCount: 0, failedCount: 0 });
      });

      await useCase.execute(new DeleteThreadCommand(mockThreadId));

      expect(callOrder).toEqual(['delete', 'purge']);
      expect(threadsRepository.delete).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );
      expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prefixes: [
            `${mockOrgId}/${mockThreadId}/`,
            `generated-images/${mockOrgId}/${mockThreadId}/`,
          ],
        }),
      );
    });

    it('should succeed silently and skip the purge when the thread does not exist', async () => {
      threadsRepository.findOne.mockResolvedValue(null);

      await useCase.execute(new DeleteThreadCommand(mockThreadId));

      expect(purgeStoragePrefixesUseCase.execute).not.toHaveBeenCalled();
      expect(threadsRepository.delete).not.toHaveBeenCalled();
    });

    it('should propagate repository errors and not purge storage', async () => {
      threadsRepository.findOne.mockResolvedValue(existingThread as never);
      threadsRepository.delete.mockRejectedValue(
        new Error('Database connection failed'),
      );
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(
        useCase.execute(new DeleteThreadCommand(mockThreadId)),
      ).rejects.toThrow('Database connection failed');

      expect(purgeStoragePrefixesUseCase.execute).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith('Failed to delete thread', {
        threadId: mockThreadId,
        userId: mockUserId,
        error: 'Database connection failed',
      });
    });

    it('should swallow purge failures after a successful delete', async () => {
      threadsRepository.findOne.mockResolvedValue(existingThread as never);
      threadsRepository.delete.mockResolvedValue(undefined);
      purgeStoragePrefixesUseCase.execute.mockRejectedValue(
        new Error('storage unavailable'),
      );

      await expect(
        useCase.execute(new DeleteThreadCommand(mockThreadId)),
      ).resolves.toBeUndefined();
      expect(threadsRepository.delete).toHaveBeenCalled();
    });
  });
});
