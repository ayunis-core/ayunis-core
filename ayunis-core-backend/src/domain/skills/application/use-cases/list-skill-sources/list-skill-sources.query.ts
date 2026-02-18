import type { UUID } from 'crypto';

export class ListSkillSourcesQuery {
  constructor(public readonly skillId: UUID) {}
}
