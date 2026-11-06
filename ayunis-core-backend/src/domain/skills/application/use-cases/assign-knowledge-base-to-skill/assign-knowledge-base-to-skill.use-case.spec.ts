jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { FindKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillKnowledgeBaseAlreadyAssignedError,
  SkillKnowledgeBaseNotFoundError,
} from 'src/domain/skills/application/skills.errors';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { AssignKnowledgeBaseToSkillCommand } from './assign-knowledge-base-to-skill.command';
import { AssignKnowledgeBaseToSkillUseCase } from './assign-knowledge-base-to-skill.use-case';

function setup(sameWorkspace: boolean) {
  const workspaceId = randomUUID();
  const knowledgeBaseWorkspaceId = sameWorkspace ? workspaceId : randomUUID();
  const skill = new WorkspaceSkill({
    workspaceId,
    name: 'Skill',
    shortDescription: '',
    instructions: '',
  });
  const knowledgeBase = new WorkspaceKnowledgeBase({
    workspaceId: knowledgeBaseWorkspaceId,
    orgId: randomUUID(),
    name: 'KB',
  });
  const repository = {
    findById: jest.fn().mockResolvedValue(skill),
    update: jest.fn().mockImplementation((updated) => Promise.resolve(updated)),
  };
  const authorization = { requireWrite: jest.fn() };
  const findKnowledgeBase = {
    execute: jest.fn().mockResolvedValue({ knowledgeBase }),
  };
  const useCase = new AssignKnowledgeBaseToSkillUseCase(
    repository as unknown as SkillRepository,
    authorization as unknown as SkillAuthorizationService,
    findKnowledgeBase as unknown as FindKnowledgeBaseUseCase,
  );
  return {
    workspaceId,
    skill,
    knowledgeBase,
    repository,
    authorization,
    findKnowledgeBase,
    useCase,
  };
}

describe(AssignKnowledgeBaseToSkillUseCase.name, () => {
  it('assigns a knowledge base from the same workspace', async () => {
    const { skill, knowledgeBase, useCase, authorization } = setup(true);
    const result = await useCase.execute(
      new AssignKnowledgeBaseToSkillCommand(skill.id, knowledgeBase.id),
    );
    expect(authorization.requireWrite).toHaveBeenCalledWith(skill);
    expect(result.knowledgeBaseIds).toContain(knowledgeBase.id);
  });

  it('rejects a duplicate workspace assignment', async () => {
    const { skill, knowledgeBase, repository, useCase } = setup(true);
    repository.findById.mockResolvedValue(
      skill.withUpdates({ knowledgeBaseIds: [knowledgeBase.id] }),
    );

    await expect(
      useCase.execute(
        new AssignKnowledgeBaseToSkillCommand(skill.id, knowledgeBase.id),
      ),
    ).rejects.toBeInstanceOf(SkillKnowledgeBaseAlreadyAssignedError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('maps inaccessible knowledge bases to the skill relation error', async () => {
    const { skill, knowledgeBase, findKnowledgeBase, useCase } = setup(true);
    findKnowledgeBase.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBase.id),
    );

    await expect(
      useCase.execute(
        new AssignKnowledgeBaseToSkillCommand(skill.id, knowledgeBase.id),
      ),
    ).rejects.toBeInstanceOf(SkillKnowledgeBaseNotFoundError);
  });

  it('rejects a knowledge base from another workspace as not found', async () => {
    const { skill, knowledgeBase, useCase } = setup(false);
    await expect(
      useCase.execute(
        new AssignKnowledgeBaseToSkillCommand(skill.id, knowledgeBase.id),
      ),
    ).rejects.toBeInstanceOf(SkillKnowledgeBaseNotFoundError);
  });

  it('does not attach a personal knowledge base to a team skill', async () => {
    const { repository, findKnowledgeBase, useCase } = setup(true);
    const teamSkill = new TeamSkill({
      teamId: randomUUID(),
      name: 'Council minutes',
      shortDescription: '',
      instructions: '',
    });
    const personal = new PersonalKnowledgeBase({
      userId: randomUUID(),
      orgId: randomUUID(),
      name: 'My notes',
    });
    repository.findById.mockResolvedValue(teamSkill);
    findKnowledgeBase.execute.mockResolvedValue({ knowledgeBase: personal });

    await expect(
      useCase.execute(
        new AssignKnowledgeBaseToSkillCommand(teamSkill.id, personal.id),
      ),
    ).rejects.toBeInstanceOf(SkillKnowledgeBaseNotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  describe('same-owner rule for team and org skills', () => {
    const orgId = randomUUID();
    const teamId = randomUUID();
    const skillParams = {
      name: 'Skill',
      shortDescription: '',
      instructions: '',
    };
    const teamSkill = new TeamSkill({ ...skillParams, teamId });
    const orgSkill = new OrgSkill({ ...skillParams, orgId });
    const sameTeam = new TeamKnowledgeBase({ name: 'KB', orgId, teamId });
    const otherTeam = new TeamKnowledgeBase({
      name: 'KB',
      orgId,
      teamId: randomUUID(),
    });
    const sameOrg = new OrgKnowledgeBase({ name: 'KB', orgId });
    const otherOrg = new OrgKnowledgeBase({ name: 'KB', orgId: randomUUID() });

    async function assign(skill: Skill, knowledgeBase: KnowledgeBase) {
      const { repository, findKnowledgeBase, useCase } = setup(true);
      repository.findById.mockResolvedValue(skill);
      findKnowledgeBase.execute.mockResolvedValue({ knowledgeBase });
      return useCase.execute(
        new AssignKnowledgeBaseToSkillCommand(skill.id, knowledgeBase.id),
      );
    }

    it.each([
      ['a team skill', teamSkill, 'its team', sameTeam],
      ['an org skill', orgSkill, 'its organization', sameOrg],
    ])('lets %s use a knowledge base of %s', async (_, skill, __, kb) => {
      await expect(assign(skill, kb)).resolves.toMatchObject({
        knowledgeBaseIds: [kb.id],
      });
    });

    it.each([
      ['a team skill', teamSkill, 'another team', otherTeam],
      ['a team skill', teamSkill, 'the organization', sameOrg],
      ['an org skill', orgSkill, 'a team', sameTeam],
      ['an org skill', orgSkill, 'another organization', otherOrg],
    ])(
      'does not let %s use a knowledge base of %s',
      async (_, skill, __, kb) => {
        await expect(assign(skill, kb)).rejects.toBeInstanceOf(
          SkillKnowledgeBaseNotFoundError,
        );
      },
    );
  });
});
