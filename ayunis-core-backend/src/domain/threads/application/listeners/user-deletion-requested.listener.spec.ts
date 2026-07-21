import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ThreadsUserDeletionRequestedListener } from './user-deletion-requested.listener';
import { ThreadsRepository } from '../ports/threads.repository';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';

describe('ThreadsUserDeletionRequestedListener', () => {
  let listener: ThreadsUserDeletionRequestedListener;
  let threadsRepository: { findAllIdsByUserId: jest.Mock };
  let purgeStoragePrefixesUseCase: { execute: jest.Mock };

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const orgId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

  beforeEach(async () => {
    threadsRepository = { findAllIdsByUserId: jest.fn().mockResolvedValue([]) };
    purgeStoragePrefixesUseCase = {
      execute: jest.fn().mockResolvedValue({ deletedCount: 0, failedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreadsUserDeletionRequestedListener,
        { provide: ThreadsRepository, useValue: threadsRepository },
        {
          provide: PurgeStoragePrefixesUseCase,
          useValue: purgeStoragePrefixesUseCase,
        },
      ],
    }).compile();

    listener = module.get(ThreadsUserDeletionRequestedListener);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('defers a prefix purge covering every thread owned by the deleted user', async () => {
    const threadA = '00000000-0000-0000-0000-0000000000a1' as UUID;
    const threadB = '00000000-0000-0000-0000-0000000000a2' as UUID;
    threadsRepository.findAllIdsByUserId.mockResolvedValue([threadA, threadB]);
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(purgeStoragePrefixesUseCase.execute).not.toHaveBeenCalled();
    const tasks = event.takeCleanupTasks();
    expect(tasks).toEqual([
      { label: 'purge thread storage', run: expect.any(Function) },
    ]);

    await tasks[0].run();
    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        prefixes: [
          `${orgId}/${threadA}/`,
          `generated-images/${orgId}/${threadA}/`,
          `${orgId}/${threadB}/`,
          `generated-images/${orgId}/${threadB}/`,
        ],
      }),
    );
  });

  it('defers nothing when the user owns no threads', async () => {
    threadsRepository.findAllIdsByUserId.mockResolvedValue([]);
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(event.takeCleanupTasks()).toHaveLength(0);
  });

  it('never throws even if lookup fails, so deletion is not blocked', async () => {
    threadsRepository.findAllIdsByUserId.mockRejectedValue(
      new Error('db down'),
    );
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await expect(
      listener.handleUserDeletionRequested(event),
    ).resolves.toBeUndefined();
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });
});
