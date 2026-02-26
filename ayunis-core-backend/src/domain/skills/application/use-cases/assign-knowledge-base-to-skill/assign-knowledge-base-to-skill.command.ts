import type { UUID } from 'crypto';

export class AssignKnowledgeBaseToSkillCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly knowledgeBaseId: UUID,
  ) {}
}
