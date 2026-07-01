import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ThreadsUserDeletionRequestedListener } from './user-deletion-requested.listener';
import { ThreadsRepository } from '../ports/threads.repository';
import { ThreadStorageCleanupService } from '../services/thread-storage-cleanup.service';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';

describe('ThreadsUserDeletionRequestedListener', () => {
  let listener: ThreadsUserDeletionRequestedListener;
  let threadsRepository: { findAllIdsByUserId: jest.Mock };
  let cleanupService: { cleanupThreadStorage: jest.Mock };

  const userId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const orgId = '123e4567-e89b-12d3-a456-426614174002' as any;

  beforeEach(async () => {
    threadsRepository = { findAllIdsByUserId: jest.fn().mockResolvedValue([]) };
    cleanupService = {
      cleanupThreadStorage: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreadsUserDeletionRequestedListener,
        { provide: ThreadsRepository, useValue: threadsRepository },
        { provide: ThreadStorageCleanupService, useValue: cleanupService },
      ],
    }).compile();

    listener = module.get(ThreadsUserDeletionRequestedListener);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('cleans storage for every thread owned by the deleted user', async () => {
    const threadA = '00000000-0000-0000-0000-0000000000a1' as any;
    const threadB = '00000000-0000-0000-0000-0000000000a2' as any;
    threadsRepository.findAllIdsByUserId.mockResolvedValue([threadA, threadB]);

    await listener.handleUserDeletionRequested(
      new UserDeletionRequestedEvent(userId, orgId),
    );

    expect(cleanupService.cleanupThreadStorage).toHaveBeenCalledWith(
      threadA,
      orgId,
    );
    expect(cleanupService.cleanupThreadStorage).toHaveBeenCalledWith(
      threadB,
      orgId,
    );
  });

  it('does nothing when the user owns no threads', async () => {
    threadsRepository.findAllIdsByUserId.mockResolvedValue([]);

    await listener.handleUserDeletionRequested(
      new UserDeletionRequestedEvent(userId, orgId),
    );

    expect(cleanupService.cleanupThreadStorage).not.toHaveBeenCalled();
  });

  it('never throws even if lookup fails, so deletion is not blocked', async () => {
    threadsRepository.findAllIdsByUserId.mockRejectedValue(
      new Error('db down'),
    );

    await expect(
      listener.handleUserDeletionRequested(
        new UserDeletionRequestedEvent(userId, orgId),
      ),
    ).resolves.toBeUndefined();
  });
});
