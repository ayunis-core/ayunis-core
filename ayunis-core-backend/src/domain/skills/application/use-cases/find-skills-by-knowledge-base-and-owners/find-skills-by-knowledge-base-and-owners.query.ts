import type { UUID } from 'crypto';

export class FindSkillsByKnowledgeBaseAndOwnersQuery {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly ownerIds: UUID[],
  ) {}
}
