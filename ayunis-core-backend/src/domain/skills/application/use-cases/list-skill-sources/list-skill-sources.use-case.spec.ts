import { randomUUID } from 'crypto';
import type { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { ListSkillSourcesQuery } from './list-skill-sources.query';
import { ListSkillSourcesUseCase } from './list-skill-sources.use-case';

describe(ListSkillSourcesUseCase.name, () => {
  it('loads and authorizes a workspace skill before returning its sources', async () => {
    const sourceId = randomUUID();
    const skill = new WorkspaceSkill({
      workspaceId: randomUUID(),
      name: 'Skill',
      shortDescription: '',
      instructions: '',
      sourceIds: [sourceId],
    });
    const repository = { findById: jest.fn().mockResolvedValue(skill) };
    const sources = {
      execute: jest.fn().mockResolvedValue([{ id: sourceId }]),
    };
    const authorization = { requireRead: jest.fn() };
    const useCase = new ListSkillSourcesUseCase(
      repository as unknown as SkillRepository,
      sources as unknown as GetSourcesByIdsUseCase,
      authorization as unknown as SkillAuthorizationService,
    );
    const result = await useCase.execute(new ListSkillSourcesQuery(skill.id));
    expect(authorization.requireRead).toHaveBeenCalledWith(skill);
    expect(result).toEqual([{ id: sourceId }]);
  });
});
