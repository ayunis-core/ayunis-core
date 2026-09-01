import { getLoggerToken } from 'nestjs-pino';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { GetSkillsByIdsQuery } from './get-skills-by-ids.query';
import { GetSkillsByIdsUseCase } from './get-skills-by-ids.use-case';

describe(GetSkillsByIdsUseCase.name, () => {
  it('loads workspace skills by trusted ids', async () => {
    const workspaceId = randomUUID();
    const skill = new Skill({
      name: 'Workspace skill',
      shortDescription: 'A workspace-owned skill.',
      instructions: 'Use workspace context.',
      workspaceId,
    });
    const repository = {
      findByIds: jest.fn().mockResolvedValue([skill]),
    };
    const module = await Test.createTestingModule({
      providers: [
        GetSkillsByIdsUseCase,
        { provide: SkillRepository, useValue: repository },
        {
          provide: getLoggerToken(GetSkillsByIdsUseCase.name),
          useValue: createPinoLoggerMock(),
        },
      ],
    }).compile();

    await expect(
      module
        .get(GetSkillsByIdsUseCase)
        .execute(new GetSkillsByIdsQuery([skill.id])),
    ).resolves.toEqual([skill]);
    expect(repository.findByIds).toHaveBeenCalledWith([skill.id]);
  });

  it('does not query for an empty id list', async () => {
    const repository = { findByIds: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        GetSkillsByIdsUseCase,
        { provide: SkillRepository, useValue: repository },
        {
          provide: getLoggerToken(GetSkillsByIdsUseCase.name),
          useValue: createPinoLoggerMock(),
        },
      ],
    }).compile();

    await expect(
      module.get(GetSkillsByIdsUseCase).execute(new GetSkillsByIdsQuery([])),
    ).resolves.toEqual([]);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });
});
