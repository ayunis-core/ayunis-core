import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RemoveDirectKbFromThreadsUseCase } from './remove-direct-kb-from-threads.use-case';
import { RemoveDirectKbFromThreadsCommand } from './remove-direct-kb-from-threads.command';
import { ThreadsRepository } from '../../ports/threads.repository';

describe('RemoveDirectKbFromThreadsUseCase', () => {
  let useCase: RemoveDirectKbFromThreadsUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  beforeAll(async () => {
    const mockThreadsRepository = {
      removeDirectKnowledgeBaseAssignments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveDirectKbFromThreadsUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
      ],
    }).compile();

    useCase = module.get(RemoveDirectKbFromThreadsUseCase);
    threadsRepository = module.get(ThreadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call repository with correct knowledgeBaseId and userIds', async () => {
    const knowledgeBaseId = randomUUID();
    const userIds = [randomUUID(), randomUUID()];
    const command = new RemoveDirectKbFromThreadsCommand(
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
    const command = new RemoveDirectKbFromThreadsCommand(knowledgeBaseId, []);

    await useCase.execute(command);

    expect(
      threadsRepository.removeDirectKnowledgeBaseAssignments,
    ).not.toHaveBeenCalled();
  });
});
