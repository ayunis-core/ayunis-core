import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { KnowledgeBasesUserDeletionRequestedListener } from './user-deletion-requested.listener';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';

describe(KnowledgeBasesUserDeletionRequestedListener.name, () => {
  let listener: KnowledgeBasesUserDeletionRequestedListener;
  let knowledgeBaseRepository: {
    findAllOwnedByUserId: jest.Mock;
    findSourcesByKnowledgeBaseIds: jest.Mock;
  };
  let cleanupSourceProcessingUseCase: { execute: jest.Mock };
  let deleteSourcesUseCase: { execute: jest.Mock };

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const orgId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

  beforeEach(async () => {
    knowledgeBaseRepository = {
      findAllOwnedByUserId: jest.fn().mockResolvedValue([]),
      findSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue([]),
    };
    cleanupSourceProcessingUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    deleteSourcesUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBasesUserDeletionRequestedListener,
        {
          provide: KnowledgeBaseRepository,
          useValue: knowledgeBaseRepository,
        },
        {
          provide: CleanupSourceProcessingUseCase,
          useValue: cleanupSourceProcessingUseCase,
        },
        {
          provide: DeleteSourcesUseCase,
          useValue: deleteSourcesUseCase,
        },
      ],
    }).compile();

    listener = module.get(KnowledgeBasesUserDeletionRequestedListener);
  });

  afterEach(() => jest.clearAllMocks());

  it('loads all sources in one bulk query and defers processing and index cleanup', async () => {
    knowledgeBaseRepository.findAllOwnedByUserId.mockResolvedValue([
      { id: 'kb-1' },
      { id: 'kb-2' },
    ]);
    knowledgeBaseRepository.findSourcesByKnowledgeBaseIds.mockResolvedValue([
      { id: 'src-1', status: SourceStatus.PROCESSING },
      { id: 'src-2', status: SourceStatus.READY },
      { id: 'src-3', status: SourceStatus.PROCESSING },
    ]);
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(
      knowledgeBaseRepository.findSourcesByKnowledgeBaseIds,
    ).toHaveBeenCalledTimes(1);
    expect(
      knowledgeBaseRepository.findSourcesByKnowledgeBaseIds,
    ).toHaveBeenCalledWith(['kb-1', 'kb-2']);
    expect(cleanupSourceProcessingUseCase.execute).not.toHaveBeenCalled();
    expect(deleteSourcesUseCase.execute).not.toHaveBeenCalled();

    const tasks = event.takeCleanupTasks();
    expect(tasks).toHaveLength(2);
    await Promise.all(tasks.map((task) => task.run()));

    expect(cleanupSourceProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: ['src-1', 'src-3'], orgId }),
    );
    expect(deleteSourcesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIds: ['src-1', 'src-2', 'src-3'],
        orgId,
      }),
    );
  });

  it('does not query sources or defer cleanup when the user owns no knowledge bases', async () => {
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(
      knowledgeBaseRepository.findSourcesByKnowledgeBaseIds,
    ).not.toHaveBeenCalled();
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });

  it('defers nothing when the owned knowledge bases have no sources', async () => {
    knowledgeBaseRepository.findAllOwnedByUserId.mockResolvedValue([
      { id: 'kb-1' },
    ]);
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(
      knowledgeBaseRepository.findSourcesByKnowledgeBaseIds,
    ).toHaveBeenCalledWith(['kb-1']);
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });

  it('defers index cleanup but not processing cleanup for ready sources', async () => {
    knowledgeBaseRepository.findAllOwnedByUserId.mockResolvedValue([
      { id: 'kb-1' },
    ]);
    knowledgeBaseRepository.findSourcesByKnowledgeBaseIds.mockResolvedValue([
      { id: 'src-1', status: SourceStatus.READY },
    ]);
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);
    const tasks = event.takeCleanupTasks();

    expect(tasks).toHaveLength(1);
    await tasks[0].run();
    expect(cleanupSourceProcessingUseCase.execute).not.toHaveBeenCalled();
    expect(deleteSourcesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: ['src-1'], orgId }),
    );
  });

  it('never throws when knowledge-base lookup fails', async () => {
    knowledgeBaseRepository.findAllOwnedByUserId.mockRejectedValue(
      new Error('db down'),
    );
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await expect(
      listener.handleUserDeletionRequested(event),
    ).resolves.toBeUndefined();
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });

  it('never throws when bulk source lookup fails', async () => {
    knowledgeBaseRepository.findAllOwnedByUserId.mockResolvedValue([
      { id: 'kb-1' },
    ]);
    knowledgeBaseRepository.findSourcesByKnowledgeBaseIds.mockRejectedValue(
      new Error('db down'),
    );
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await expect(
      listener.handleUserDeletionRequested(event),
    ).resolves.toBeUndefined();
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });
});
