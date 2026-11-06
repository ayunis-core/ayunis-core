import { randomUUID } from 'crypto';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseProcessingCleanupService } from 'src/domain/knowledge-bases/application/services/knowledge-base-processing-cleanup.service';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import type { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TeamDeletionRequestedEvent } from 'src/iam/teams/application/events/team-deletion-requested.event';
import { KnowledgeBasesTeamDeletionRequestedListener } from './team-deletion-requested.listener';

describe(KnowledgeBasesTeamDeletionRequestedListener.name, () => {
  const teamId = randomUUID();
  const orgId = randomUUID();
  const knowledgeBase = new TeamKnowledgeBase({
    name: 'Bauordnung',
    orgId,
    teamId,
  });

  const processingSourceId = randomUUID();

  function setup() {
    const repository = {
      findAllByTeamId: jest.fn().mockResolvedValue([knowledgeBase]),
      findSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue([
        { id: randomUUID(), status: SourceStatus.READY },
        { id: processingSourceId, status: SourceStatus.PROCESSING },
      ]),
    };
    const cleanupProcessing = { execute: jest.fn() };
    const listener = new KnowledgeBasesTeamDeletionRequestedListener(
      repository as unknown as KnowledgeBaseRepository,
      new KnowledgeBaseProcessingCleanupService(
        repository as unknown as KnowledgeBaseRepository,
        cleanupProcessing as unknown as CleanupSourceProcessingUseCase,
      ),
    );
    return { repository, cleanupProcessing, listener };
  }

  it('defers processing cleanup for the team knowledge base sources still in progress', async () => {
    const { repository, cleanupProcessing, listener } = setup();
    const event = new TeamDeletionRequestedEvent(teamId, orgId);

    await listener.handle(event);

    expect(repository.findAllByTeamId).toHaveBeenCalledWith(teamId);
    expect(cleanupProcessing.execute).not.toHaveBeenCalled();
    const tasks = event.takeCleanupTasks();
    expect(tasks).toHaveLength(1);
    await tasks[0].run();
    expect(cleanupProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [processingSourceId], orgId }),
    );
  });

  it('never blocks team deletion when resolving sources fails', async () => {
    const { repository, listener } = setup();
    repository.findAllByTeamId.mockRejectedValue(new Error('db down'));

    await expect(
      listener.handle(new TeamDeletionRequestedEvent(teamId, orgId)),
    ).resolves.toBeUndefined();
  });
});
