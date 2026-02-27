import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RemoveKbAssignmentsByOriginSkillUseCase } from './remove-kb-assignments-by-origin-skill.use-case';
import { RemoveKbAssignmentsByOriginSkillCommand } from './remove-kb-assignments-by-origin-skill.command';
import { ThreadsRepository } from '../../ports/threads.repository';

describe('RemoveKbAssignmentsByOriginSkillUseCase', () => {
  let useCase: RemoveKbAssignmentsByOriginSkillUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  beforeAll(async () => {
    const mockThreadsRepository = {
      removeKnowledgeBaseAssignmentsByOriginSkill: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveKbAssignmentsByOriginSkillUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
      ],
    }).compile();

    useCase = module.get(RemoveKbAssignmentsByOriginSkillUseCase);
    threadsRepository = module.get(ThreadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call repository with correct skillId and userIds', async () => {
    const skillId = randomUUID();
    const userIds = [randomUUID(), randomUUID()];
    const command = new RemoveKbAssignmentsByOriginSkillCommand(
      skillId,
      userIds,
    );

    await useCase.execute(command);

    expect(
      threadsRepository.removeKnowledgeBaseAssignmentsByOriginSkill,
    ).toHaveBeenCalledWith({
      originSkillId: skillId,
      userIds,
    });
  });

  it('should not call repository when userIds is empty', async () => {
    const skillId = randomUUID();
    const command = new RemoveKbAssignmentsByOriginSkillCommand(skillId, []);

    await useCase.execute(command);

    expect(
      threadsRepository.removeKnowledgeBaseAssignmentsByOriginSkill,
    ).not.toHaveBeenCalled();
  });
});
