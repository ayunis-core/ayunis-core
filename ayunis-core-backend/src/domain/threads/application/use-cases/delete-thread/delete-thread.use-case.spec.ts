import type { TestingModule } from '@nestjs/testing';
import {
  createLoggerMock,
  type LoggerMock,
} from 'src/common/testing/logger.mock';
import { Test } from '@nestjs/testing';

import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { DeleteThreadUseCase } from './delete-thread.use-case';
import { DeleteThreadCommand } from './delete-thread.command';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { ThreadDeletionRequestedEvent } from 'src/domain/threads/application/events/thread-deletion-requested.event';

describe('DeleteThreadUseCase', () => {
  let useCase: DeleteThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let purgeStoragePrefixesUseCase: { execute: jest.Mock };
  let eventEmitter: { emitAsync: jest.Mock };
  let logger: LoggerMock;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;

  beforeEach(async () => {
    logger = createLoggerMock();
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
    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
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
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    useCase = module.get<DeleteThreadUseCase>(DeleteThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);
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
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        ThreadDeletionRequestedEvent.EVENT_NAME,
        expect.objectContaining({
          threadId: mockThreadId,
          userId: mockUserId,
          orgId: mockOrgId,
        }),
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
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('should propagate repository errors and not purge storage', async () => {
      threadsRepository.findOne.mockResolvedValue(existingThread as never);
      const repositoryError = new Error('Database connection failed');
      threadsRepository.delete.mockRejectedValue(repositoryError);

      await expect(
        useCase.execute(new DeleteThreadCommand(mockThreadId)),
      ).rejects.toThrow('Database connection failed');

      expect(purgeStoragePrefixesUseCase.execute).not.toHaveBeenCalled();
      expect(eventEmitter.emitAsync).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        {
          threadId: mockThreadId,
          userId: mockUserId,
          err: repositoryError,
        },
        'Failed to delete thread',
      );
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
