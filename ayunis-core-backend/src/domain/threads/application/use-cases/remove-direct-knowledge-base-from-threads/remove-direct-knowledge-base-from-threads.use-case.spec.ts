import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RemoveDirectKnowledgeBaseFromThreadsUseCase } from './remove-direct-knowledge-base-from-threads.use-case';
import { RemoveDirectKnowledgeBaseFromThreadsCommand } from './remove-direct-knowledge-base-from-threads.command';
import { ThreadsRepository } from '../../ports/threads.repository';

describe('RemoveDirectKnowledgeBaseFromThreadsUseCase', () => {
  let useCase: RemoveDirectKnowledgeBaseFromThreadsUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  beforeAll(async () => {
    const mockThreadsRepository = {
      removeDirectKnowledgeBaseAssignments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveDirectKnowledgeBaseFromThreadsUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
      ],
    }).compile();

    useCase = module.get(RemoveDirectKnowledgeBaseFromThreadsUseCase);
    threadsRepository = module.get(ThreadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call repository with correct knowledgeBaseId and userIds', async () => {
    const knowledgeBaseId = randomUUID();
    const userIds = [randomUUID(), randomUUID()];
    const command = new RemoveDirectKnowledgeBaseFromThreadsCommand(
      knowledgeBaseId,
      userIds,
    );

    await useCase.execute(command);

    expect(
      threadsRepository.removeDirectKnowledgeBaseAssignments,
    ).toHaveBeenCalledWith({
      knowledgeBaseId,
      userIds,
    });
  });

  it('should not call repository when userIds is empty', async () => {
    const knowledgeBaseId = randomUUID();
    const command = new RemoveDirectKnowledgeBaseFromThreadsCommand(
      knowledgeBaseId,
      [],
    );

    await useCase.execute(command);

    expect(
      threadsRepository.removeDirectKnowledgeBaseAssignments,
    ).not.toHaveBeenCalled();
  });
});
