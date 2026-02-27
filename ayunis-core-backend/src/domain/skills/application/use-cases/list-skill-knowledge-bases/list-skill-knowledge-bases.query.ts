import type { UUID } from 'crypto';

export class ListSkillKnowledgeBasesQuery {
  constructor(public readonly skillId: UUID) {}
}
