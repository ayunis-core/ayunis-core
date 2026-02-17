import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RemoveSkillSourcesFromThreadsUseCase } from './remove-skill-sources-from-threads.use-case';
import { RemoveSkillSourcesFromThreadsCommand } from './remove-skill-sources-from-threads.command';
import { ThreadsRepository } from '../../ports/threads.repository';

describe('RemoveSkillSourcesFromThreadsUseCase', () => {
  let useCase: RemoveSkillSourcesFromThreadsUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  beforeEach(async () => {
    const mockThreadsRepository = {
      removeSourceAssignmentsByOriginSkill: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveSkillSourcesFromThreadsUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
      ],
    }).compile();

    useCase = module.get<RemoveSkillSourcesFromThreadsUseCase>(
      RemoveSkillSourcesFromThreadsUseCase,
    );
    threadsRepository = module.get(ThreadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call repository with correct skillId and userIds', async () => {
    const skillId = randomUUID();
    const userIds = [randomUUID(), randomUUID()];
    const command = new RemoveSkillSourcesFromThreadsCommand(skillId, userIds);

    await useCase.execute(command);

    expect(
      threadsRepository.removeSourceAssignmentsByOriginSkill,
    ).toHaveBeenCalledWith({
      originSkillId: skillId,
      userIds,
    });
  });

  it('should not call repository when userIds is empty', async () => {
    const skillId = randomUUID();
    const command = new RemoveSkillSourcesFromThreadsCommand(skillId, []);

    await useCase.execute(command);

    expect(
      threadsRepository.removeSourceAssignmentsByOriginSkill,
    ).not.toHaveBeenCalled();
  });
});
