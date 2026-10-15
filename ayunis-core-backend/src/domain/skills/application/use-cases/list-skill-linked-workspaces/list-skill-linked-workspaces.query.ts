import type { UUID } from 'crypto';

export class ListSkillLinkedWorkspacesQuery {
  constructor(public readonly skillId: UUID) {}
}
