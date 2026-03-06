import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from './remove-knowledge-base-assignments-by-origin-skill.use-case';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillCommand } from './remove-knowledge-base-assignments-by-origin-skill.command';
import { ThreadsRepository } from '../../ports/threads.repository';

describe('RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase', () => {
  let useCase: RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  beforeAll(async () => {
    const mockThreadsRepository = {
      removeKnowledgeBaseAssignmentsByOriginSkill: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
      ],
    }).compile();

    useCase = module.get(RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase);
    threadsRepository = module.get(ThreadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call repository with correct skillId and userIds', async () => {
    const skillId = randomUUID();
    const userIds = [randomUUID(), randomUUID()];
    const command = new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(
      skillId,
      userIds,
    );

    await useCase.execute(command);

    expect(
      threadsRepository.removeKnowledgeBaseAssignmentsByOriginSkill,
    ).toHaveBeenCalledWith({
      originSkillId: skillId,
      userIds,
      knowledgeBaseId: undefined,
    });
  });

  it('should pass knowledgeBaseId to repository when provided', async () => {
    const skillId = randomUUID();
    const userIds = [randomUUID()];
    const knowledgeBaseId = randomUUID();
    const command = new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(
      skillId,
      userIds,
      knowledgeBaseId,
    );

    await useCase.execute(command);

    expect(
      threadsRepository.removeKnowledgeBaseAssignmentsByOriginSkill,
    ).toHaveBeenCalledWith({
      originSkillId: skillId,
      userIds,
      knowledgeBaseId,
    });
  });

  it('should not call repository when userIds is empty', async () => {
    const skillId = randomUUID();
    const command = new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(
      skillId,
      [],
    );

    await useCase.execute(command);

    expect(
      threadsRepository.removeKnowledgeBaseAssignmentsByOriginSkill,
    ).not.toHaveBeenCalled();
  });
});
