import type { UUID } from 'crypto';
import { SkillsUserDeletionRequestedListener } from './user-deletion-requested.listener';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { DeleteUnreferencedSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-unreferenced-sources/delete-unreferenced-sources.use-case';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';

describe(SkillsUserDeletionRequestedListener.name, () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const orgId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const sourceA = '00000000-0000-0000-0000-0000000000b1' as UUID;

  let skillRepository: { findSourceIdsByOwnerUserId: jest.Mock };
  let deleteUnreferencedSources: { execute: jest.Mock };
  let listener: SkillsUserDeletionRequestedListener;

  beforeEach(() => {
    skillRepository = {
      findSourceIdsByOwnerUserId: jest.fn().mockResolvedValue([]),
    };
    deleteUnreferencedSources = { execute: jest.fn().mockResolvedValue([]) };
    listener = new SkillsUserDeletionRequestedListener(
      skillRepository as unknown as SkillRepository,
      deleteUnreferencedSources as unknown as DeleteUnreferencedSourcesUseCase,
    );
  });

  it('resolves the sources before the delete and releases them afterwards', async () => {
    skillRepository.findSourceIdsByOwnerUserId.mockResolvedValue([sourceA]);
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(deleteUnreferencedSources.execute).not.toHaveBeenCalled();
    const tasks = event.takeCleanupTasks();
    expect(tasks.map((task) => task.label)).toEqual(['delete skill sources']);

    await tasks[0].run();
    expect(deleteUnreferencedSources.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [sourceA], orgId }),
    );
  });

  it('defers nothing when the user owns no skill sources', async () => {
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(event.takeCleanupTasks()).toHaveLength(0);
  });

  it('never throws when the lookup fails, so deletion is not blocked', async () => {
    skillRepository.findSourceIdsByOwnerUserId.mockRejectedValue(
      new Error('db down'),
    );
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await expect(
      listener.handleUserDeletionRequested(event),
    ).resolves.toBeUndefined();
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });
});
