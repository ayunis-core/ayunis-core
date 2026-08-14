import type { TestingModule } from '@nestjs/testing';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { getLoggerToken } from 'nestjs-pino';
import { Test } from '@nestjs/testing';

import { randomUUID } from 'crypto';
import { RemoveSkillSourcesFromThreadsUseCase } from './remove-skill-sources-from-threads.use-case';
import { RemoveSkillSourcesFromThreadsCommand } from './remove-skill-sources-from-threads.command';
import { ThreadsRepository } from '../../ports/threads.repository';

describe('RemoveSkillSourcesFromThreadsUseCase', () => {
  let useCase: RemoveSkillSourcesFromThreadsUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  beforeAll(async () => {
    const mockThreadsRepository = {
      removeSourceAssignmentsByOriginSkill: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveSkillSourcesFromThreadsUseCase,
        {
          provide: getLoggerToken(RemoveSkillSourcesFromThreadsUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
      ],
    }).compile();

    useCase = module.get<RemoveSkillSourcesFromThreadsUseCase>(
      RemoveSkillSourcesFromThreadsUseCase,
    );
    threadsRepository = module.get(ThreadsRepository);
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
