import type { UUID } from 'crypto';

export class RemoveKnowledgeBaseFromSkillsCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly skillIds: UUID[],
  ) {}
}
