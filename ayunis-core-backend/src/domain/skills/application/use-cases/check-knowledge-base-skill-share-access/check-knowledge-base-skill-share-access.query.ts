import type { UUID } from 'crypto';

export class CheckKnowledgeBaseSkillShareAccessQuery {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly knowledgeBaseOwnerId: UUID,
  ) {}
}
