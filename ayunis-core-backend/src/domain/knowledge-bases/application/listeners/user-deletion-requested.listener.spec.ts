import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { KnowledgeBasesUserDeletionRequestedListener } from './user-deletion-requested.listener';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';

describe('KnowledgeBasesUserDeletionRequestedListener', () => {
  let listener: KnowledgeBasesUserDeletionRequestedListener;
  let knowledgeBaseRepository: {
    findAllByUserId: jest.Mock;
    findSourcesByKnowledgeBaseId: jest.Mock;
  };
  let cleanupSourceProcessingUseCase: { execute: jest.Mock };

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const orgId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

  beforeEach(async () => {
    knowledgeBaseRepository = {
      findAllByUserId: jest.fn().mockResolvedValue([]),
      findSourcesByKnowledgeBaseId: jest.fn().mockResolvedValue([]),
    };
    cleanupSourceProcessingUseCase = {
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
      ],
    }).compile();

    listener = module.get(KnowledgeBasesUserDeletionRequestedListener);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('defers processing cleanup for the processing sources of every knowledge base', async () => {
    knowledgeBaseRepository.findAllByUserId.mockResolvedValue([
      { id: 'kb-1' },
      { id: 'kb-2' },
    ]);
    knowledgeBaseRepository.findSourcesByKnowledgeBaseId.mockImplementation(
      (kbId: string) =>
        Promise.resolve(
          kbId === 'kb-1'
            ? [
                { id: 'src-1', status: SourceStatus.PROCESSING },
                { id: 'src-2', status: SourceStatus.READY },
              ]
            : [{ id: 'src-3', status: SourceStatus.PROCESSING }],
        ),
    );
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(cleanupSourceProcessingUseCase.execute).not.toHaveBeenCalled();
    const tasks = event.takeCleanupTasks();
    expect(tasks).toHaveLength(1);

    await tasks[0].run();
    expect(cleanupSourceProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: ['src-1', 'src-3'], orgId }),
    );
  });

  it('defers nothing when the user has no knowledge bases', async () => {
    knowledgeBaseRepository.findAllByUserId.mockResolvedValue([]);
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(event.takeCleanupTasks()).toHaveLength(0);
  });

  it('defers nothing when no source is processing', async () => {
    knowledgeBaseRepository.findAllByUserId.mockResolvedValue([{ id: 'kb-1' }]);
    knowledgeBaseRepository.findSourcesByKnowledgeBaseId.mockResolvedValue([
      { id: 'src-1', status: SourceStatus.READY },
    ]);
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await listener.handleUserDeletionRequested(event);

    expect(event.takeCleanupTasks()).toHaveLength(0);
  });

  it('never throws so user deletion is not blocked', async () => {
    knowledgeBaseRepository.findAllByUserId.mockRejectedValue(
      new Error('db down'),
    );
    const event = new UserDeletionRequestedEvent(userId, orgId);

    await expect(
      listener.handleUserDeletionRequested(event),
    ).resolves.toBeUndefined();
    expect(event.takeCleanupTasks()).toHaveLength(0);
  });
});
