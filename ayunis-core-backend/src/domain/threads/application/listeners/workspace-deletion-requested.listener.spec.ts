import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import type { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { ThreadsWorkspaceDeletionRequestedListener } from './workspace-deletion-requested.listener';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const USER_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const ORG_ID = '33333333-3333-4333-8333-333333333333' as UUID;
const THREAD_ID = '44444444-4444-4444-8444-444444444444' as UUID;

describe('ThreadsWorkspaceDeletionRequestedListener', () => {
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let purgeStoragePrefixesUseCase: jest.Mocked<PurgeStoragePrefixesUseCase>;
  let listener: ThreadsWorkspaceDeletionRequestedListener;

  function anEvent(): WorkspaceDeletionRequestedEvent {
    return new WorkspaceDeletionRequestedEvent(WORKSPACE_ID, USER_ID, ORG_ID);
  }

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  beforeEach(() => {
    threadsRepository = {
      findAllIdsByWorkspaceId: jest.fn().mockResolvedValue([THREAD_ID]),
    } as unknown as jest.Mocked<ThreadsRepository>;
    purgeStoragePrefixesUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PurgeStoragePrefixesUseCase>;
    listener = new ThreadsWorkspaceDeletionRequestedListener(
      threadsRepository,
      purgeStoragePrefixesUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('defers the purge instead of running it during the event', async () => {
    const event = anEvent();

    await listener.handleWorkspaceDeletionRequested(event);

    expect(purgeStoragePrefixesUseCase.execute).not.toHaveBeenCalled();
    const tasks = event.takeCleanupTasks();
    expect(tasks).toHaveLength(1);

    await tasks[0].run();
    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        prefixes: [
          `${ORG_ID}/${THREAD_ID}/`,
          `generated-images/${ORG_ID}/${THREAD_ID}/`,
        ],
      }),
    );
  });

  it('registers nothing when the workspace has no chats', async () => {
    threadsRepository.findAllIdsByWorkspaceId.mockResolvedValue([]);
    const event = anEvent();

    await listener.handleWorkspaceDeletionRequested(event);

    expect(event.takeCleanupTasks()).toHaveLength(0);
  });

  it('swallows a lookup failure so it cannot block the deletion', async () => {
    threadsRepository.findAllIdsByWorkspaceId.mockRejectedValue(
      new Error('connection lost'),
    );
    const event = anEvent();

    await expect(
      listener.handleWorkspaceDeletionRequested(event),
    ).resolves.toBeUndefined();
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });
});
