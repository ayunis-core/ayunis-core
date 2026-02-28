import type { UUID } from 'crypto';

export class RemoveKnowledgeBaseAssignmentsByOriginSkillCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly userIds: UUID[],
    public readonly knowledgeBaseId?: UUID,
  ) {}
}
