import { randomUUID } from 'crypto';
import type { GetAccessibleKnowledgeBaseContextsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-accessible-knowledge-base-contexts/get-accessible-knowledge-base-contexts.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { ListSkillKnowledgeBasesQuery } from './list-skill-knowledge-bases.query';
import { ListSkillKnowledgeBasesUseCase } from './list-skill-knowledge-bases.use-case';

describe(ListSkillKnowledgeBasesUseCase.name, () => {
  it('loads and authorizes the skill before resolving knowledge-base contexts', async () => {
    const knowledgeBaseId = randomUUID();
    const skill = new WorkspaceSkill({
      workspaceId: randomUUID(),
      name: 'Skill',
      shortDescription: '',
      instructions: '',
      knowledgeBaseIds: [knowledgeBaseId],
    });
    const repository = { findById: jest.fn().mockResolvedValue(skill) };
    const authorization = { requireRead: jest.fn() };
    const contexts = { execute: jest.fn().mockResolvedValue([]) };
    const useCase = new ListSkillKnowledgeBasesUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
      contexts as unknown as GetAccessibleKnowledgeBaseContextsUseCase,
    );
    await useCase.execute(new ListSkillKnowledgeBasesQuery(skill.id));
    expect(authorization.requireRead).toHaveBeenCalledWith(skill);
    expect(contexts.execute).toHaveBeenCalledWith({
      knowledgeBaseIds: [knowledgeBaseId],
    });
  });
});
