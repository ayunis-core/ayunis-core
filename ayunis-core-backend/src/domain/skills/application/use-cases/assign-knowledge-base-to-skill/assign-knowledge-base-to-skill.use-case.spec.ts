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
});
