jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillKnowledgeBaseNotAssignedError } from 'src/domain/skills/application/skills.errors';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { UnassignKnowledgeBaseFromSkillCommand } from './unassign-knowledge-base-from-skill.command';
import { UnassignKnowledgeBaseFromSkillUseCase } from './unassign-knowledge-base-from-skill.use-case';

describe(UnassignKnowledgeBaseFromSkillUseCase.name, () => {
  it('removes a workspace knowledge-base assignment', async () => {
    const knowledgeBaseId = randomUUID();
    const skill = new WorkspaceSkill({
      workspaceId: randomUUID(),
      name: 'Skill',
      shortDescription: '',
      instructions: '',
      knowledgeBaseIds: [knowledgeBaseId],
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(skill),
      update: jest
        .fn()
        .mockImplementation((updated) => Promise.resolve(updated)),
    };
    const authorization = { requireWrite: jest.fn() };
    const useCase = new UnassignKnowledgeBaseFromSkillUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
    );
    const result = await useCase.execute(
      new UnassignKnowledgeBaseFromSkillCommand(skill.id, knowledgeBaseId),
    );
    expect(result.knowledgeBaseIds).toEqual([]);
    expect(authorization.requireWrite).toHaveBeenCalledWith(skill);
  });

  it('rejects removing an absent workspace knowledge-base assignment', async () => {
    const skill = new WorkspaceSkill({
      workspaceId: randomUUID(),
      name: 'Skill',
      shortDescription: '',
      instructions: '',
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(skill),
      update: jest.fn(),
    };
    const useCase = new UnassignKnowledgeBaseFromSkillUseCase(
      repository as unknown as SkillRepository,
      { requireWrite: jest.fn() } as unknown as SkillAuthorizationService,
    );

    await expect(
      useCase.execute(
        new UnassignKnowledgeBaseFromSkillCommand(skill.id, randomUUID()),
      ),
    ).rejects.toBeInstanceOf(SkillKnowledgeBaseNotAssignedError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
