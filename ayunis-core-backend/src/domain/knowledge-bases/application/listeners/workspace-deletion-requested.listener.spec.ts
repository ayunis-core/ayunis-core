import { randomUUID } from 'crypto';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { KnowledgeBasesWorkspaceDeletionRequestedListener } from './workspace-deletion-requested.listener';

describe(KnowledgeBasesWorkspaceDeletionRequestedListener.name, () => {
  const workspaceId = randomUUID();
  const userId = randomUUID();
  const orgId = randomUUID();
  let repository: {
    findAllByWorkspaceId: jest.Mock;
    findSourcesByKnowledgeBaseIds: jest.Mock;
  };
  let cleanupProcessing: { execute: jest.Mock };
  let listener: KnowledgeBasesWorkspaceDeletionRequestedListener;

  beforeEach(() => {
    repository = {
      findAllByWorkspaceId: jest.fn().mockResolvedValue([]),
      findSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue([]),
    };
    cleanupProcessing = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    listener = new KnowledgeBasesWorkspaceDeletionRequestedListener(
      repository as unknown as KnowledgeBaseRepository,
      cleanupProcessing as unknown as CleanupSourceProcessingUseCase,
    );
  });

  function event(): WorkspaceDeletionRequestedEvent {
    return new WorkspaceDeletionRequestedEvent(workspaceId, userId, orgId);
  }

  it('loads all sources in one bulk query and defers only external processing cleanup', async () => {
    const firstKnowledgeBaseId = randomUUID();
    const secondKnowledgeBaseId = randomUUID();
    const processingSourceId = randomUUID();
    const readySourceId = randomUUID();
    repository.findAllByWorkspaceId.mockResolvedValue([
      { id: firstKnowledgeBaseId },
      { id: secondKnowledgeBaseId },
    ]);
    repository.findSourcesByKnowledgeBaseIds.mockResolvedValue([
      { id: processingSourceId, status: SourceStatus.PROCESSING },
      { id: readySourceId, status: SourceStatus.READY },
    ]);
    const deletionEvent = event();

    await listener.handle(deletionEvent);

    expect(repository.findSourcesByKnowledgeBaseIds).toHaveBeenCalledTimes(1);
    expect(repository.findSourcesByKnowledgeBaseIds).toHaveBeenCalledWith([
      firstKnowledgeBaseId,
      secondKnowledgeBaseId,
    ]);
    expect(cleanupProcessing.execute).not.toHaveBeenCalled();

    const cleanupTasks = deletionEvent.takeCleanupTasks();
    expect(cleanupTasks).toHaveLength(1);
    await Promise.all(cleanupTasks.map((task) => task.run()));

    expect(cleanupProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [processingSourceId], orgId }),
    );
  });

  it('does not query sources or defer cleanup for an empty workspace', async () => {
    const deletionEvent = event();

    await listener.handle(deletionEvent);

    expect(repository.findSourcesByKnowledgeBaseIds).not.toHaveBeenCalled();
    expect(deletionEvent.takeCleanupTasks()).toHaveLength(0);
  });

  it('defers nothing when workspace knowledge bases have no sources', async () => {
    repository.findAllByWorkspaceId.mockResolvedValue([{ id: randomUUID() }]);
    const deletionEvent = event();

    await listener.handle(deletionEvent);

    expect(repository.findSourcesByKnowledgeBaseIds).toHaveBeenCalledTimes(1);
    expect(deletionEvent.takeCleanupTasks()).toHaveLength(0);
  });

  it('relies entirely on database cascades when no source is processing', async () => {
    const readySourceId = randomUUID();
    repository.findAllByWorkspaceId.mockResolvedValue([{ id: randomUUID() }]);
    repository.findSourcesByKnowledgeBaseIds.mockResolvedValue([
      { id: readySourceId, status: SourceStatus.READY },
    ]);
    const deletionEvent = event();

    await listener.handle(deletionEvent);
    const cleanupTasks = deletionEvent.takeCleanupTasks();

    expect(cleanupTasks).toHaveLength(0);
    expect(cleanupProcessing.execute).not.toHaveBeenCalled();
  });

  it('does not block deletion when knowledge-base lookup fails', async () => {
    repository.findAllByWorkspaceId.mockRejectedValue(new Error('db down'));
    const deletionEvent = event();

    await expect(listener.handle(deletionEvent)).resolves.toBeUndefined();
    expect(deletionEvent.takeCleanupTasks()).toHaveLength(0);
  });

  it('does not block deletion when bulk source lookup fails', async () => {
    repository.findAllByWorkspaceId.mockResolvedValue([{ id: randomUUID() }]);
    repository.findSourcesByKnowledgeBaseIds.mockRejectedValue(
      new Error('db down'),
    );
    const deletionEvent = event();

    await expect(listener.handle(deletionEvent)).resolves.toBeUndefined();
    expect(deletionEvent.takeCleanupTasks()).toHaveLength(0);
  });
});
