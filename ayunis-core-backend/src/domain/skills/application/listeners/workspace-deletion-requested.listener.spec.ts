import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { randomUUID } from 'crypto';
import type { GetSkillsByIdsUseCase } from 'src/domain/skills/application/use-cases/get-skills-by-ids/get-skills-by-ids.use-case';

import type { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import type { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import type { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { SkillsWorkspaceDeletionRequestedListener } from './workspace-deletion-requested.listener';

describe(SkillsWorkspaceDeletionRequestedListener.name, () => {
  it('defers cleanup of workspace skill sources', async () => {
    const workspaceId = randomUUID();
    const skillId = randomUUID();
    const sourceId = randomUUID();
    const orgId = randomUUID();
    const getSkills = {
      execute: jest.fn().mockResolvedValue([
        new WorkspaceSkill({
          id: skillId,
          name: 'Workspace skill',
          shortDescription: 'Workspace skill',
          instructions: 'Use project context.',
          workspaceId,
          sourceIds: [sourceId],
        }),
      ]),
    } as unknown as jest.Mocked<GetSkillsByIdsUseCase>;
    const getSources = {
      execute: jest
        .fn()
        .mockResolvedValue([{ id: sourceId, status: SourceStatus.PROCESSING }]),
    } as unknown as jest.Mocked<GetSourcesByIdsUseCase>;
    const cleanupProcessing = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CleanupSourceProcessingUseCase>;
    const deleteSources = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteSourcesUseCase>;
    const listener = new SkillsWorkspaceDeletionRequestedListener(
      getSkills,
      getSources,
      cleanupProcessing,
      deleteSources,
    );
    const event = new WorkspaceDeletionRequestedEvent(
      workspaceId,
      randomUUID(),
      orgId,
      [skillId],
    );

    await listener.handle(event);
    const tasks = event.takeCleanupTasks();
    expect(tasks).toHaveLength(2);
    await Promise.all(tasks.map((task) => task.run()));

    expect(cleanupProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [sourceId], orgId }),
    );
    expect(deleteSources.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [sourceId], orgId }),
    );
  });
});
