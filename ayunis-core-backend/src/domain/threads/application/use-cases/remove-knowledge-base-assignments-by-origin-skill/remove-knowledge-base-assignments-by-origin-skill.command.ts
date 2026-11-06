import type { UUID } from 'crypto';

export class RemoveKnowledgeBaseAssignmentsByOriginSkillCommand {
  /** `userIds: null` removes the assignments from every user's threads. */
  constructor(
    public readonly skillId: UUID,
    public readonly userIds: UUID[] | null,
    public readonly knowledgeBaseId?: UUID,
  ) {}
}
