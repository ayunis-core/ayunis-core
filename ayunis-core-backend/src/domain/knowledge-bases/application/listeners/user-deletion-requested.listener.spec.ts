import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { KnowledgeBasesUserDeletionRequestedListener } from './user-deletion-requested.listener';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';

describe('KnowledgeBasesUserDeletionRequestedListener', () => {
  let listener: KnowledgeBasesUserDeletionRequestedListener;
  let knowledgeBaseRepository: {
    findAllByUserId: jest.Mock;
    findSourcesByKnowledgeBaseId: jest.Mock;
  };
  let deleteSourcesUseCase: { execute: jest.Mock };

  const userId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const orgId = '123e4567-e89b-12d3-a456-426614174002' as any;

  beforeEach(async () => {
    knowledgeBaseRepository = {
      findAllByUserId: jest.fn().mockResolvedValue([]),
      findSourcesByKnowledgeBaseId: jest.fn().mockResolvedValue([]),
    };
    deleteSourcesUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBasesUserDeletionRequestedListener,
        {
          provide: KnowledgeBaseRepository,
          useValue: knowledgeBaseRepository,
        },
        { provide: DeleteSourcesUseCase, useValue: deleteSourcesUseCase },
      ],
    }).compile();

    listener = module.get(KnowledgeBasesUserDeletionRequestedListener);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('deletes the sources of every knowledge base owned by the user', async () => {
    knowledgeBaseRepository.findAllByUserId.mockResolvedValue([
      { id: 'kb-1' },
      { id: 'kb-2' },
    ]);
    knowledgeBaseRepository.findSourcesByKnowledgeBaseId.mockImplementation(
      (kbId: string) =>
        Promise.resolve(
          kbId === 'kb-1'
            ? [{ id: 'src-1' }, { id: 'src-2' }]
            : [{ id: 'src-3' }],
        ),
    );

    await listener.handleUserDeletionRequested(
      new UserDeletionRequestedEvent(userId, orgId),
    );

    expect(deleteSourcesUseCase.execute).toHaveBeenCalledTimes(1);
    expect(deleteSourcesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: ['src-1', 'src-2', 'src-3'] }),
    );
  });

  it('does not call source deletion when the user has no knowledge bases', async () => {
    knowledgeBaseRepository.findAllByUserId.mockResolvedValue([]);

    await listener.handleUserDeletionRequested(
      new UserDeletionRequestedEvent(userId, orgId),
    );

    expect(deleteSourcesUseCase.execute).not.toHaveBeenCalled();
  });

  it('does not call source deletion when knowledge bases have no sources', async () => {
    knowledgeBaseRepository.findAllByUserId.mockResolvedValue([{ id: 'kb-1' }]);
    knowledgeBaseRepository.findSourcesByKnowledgeBaseId.mockResolvedValue([]);

    await listener.handleUserDeletionRequested(
      new UserDeletionRequestedEvent(userId, orgId),
    );

    expect(deleteSourcesUseCase.execute).not.toHaveBeenCalled();
  });

  it('never throws so user deletion is not blocked', async () => {
    knowledgeBaseRepository.findAllByUserId.mockRejectedValue(
      new Error('db down'),
    );

    await expect(
      listener.handleUserDeletionRequested(
        new UserDeletionRequestedEvent(userId, orgId),
      ),
    ).resolves.toBeUndefined();
  });
});
