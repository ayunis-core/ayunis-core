import type { UUID } from 'crypto';

export class UnassignKnowledgeBaseFromSkillCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
