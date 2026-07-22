import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { StorageOrgDeletionRequestedListener } from './org-deletion-requested.listener';
import { PurgeOrgStorageUseCase } from '../use-cases/purge-org-storage/purge-org-storage.use-case';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import type { UUID } from 'crypto';

describe('StorageOrgDeletionRequestedListener', () => {
  let listener: StorageOrgDeletionRequestedListener;
  let purgeOrgStorageUseCase: { execute: jest.Mock };

  const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    purgeOrgStorageUseCase = {
      execute: jest.fn().mockResolvedValue({ deletedCount: 0, failedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageOrgDeletionRequestedListener,
        { provide: PurgeOrgStorageUseCase, useValue: purgeOrgStorageUseCase },
      ],
    }).compile();

    listener = module.get(StorageOrgDeletionRequestedListener);
  });

  afterEach(() => jest.clearAllMocks());

  it('defers the purge instead of running it inline', () => {
    const event = new OrgDeletionRequestedEvent(orgId);

    listener.handleOrgDeletionRequested(event);

    expect(purgeOrgStorageUseCase.execute).not.toHaveBeenCalled();
    expect(event.takeCleanupTasks()).toEqual([
      { label: 'purge org storage', run: expect.any(Function) },
    ]);
  });

  it('purges the org storage when the deferred task runs', async () => {
    const event = new OrgDeletionRequestedEvent(orgId);
    listener.handleOrgDeletionRequested(event);

    const [task] = event.takeCleanupTasks();
    await task.run();

    expect(purgeOrgStorageUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId }),
    );
  });
});
