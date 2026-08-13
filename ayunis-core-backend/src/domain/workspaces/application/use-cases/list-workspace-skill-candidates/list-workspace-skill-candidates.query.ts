import type { UUID } from 'crypto';

export class ListWorkspaceSkillCandidatesQuery {
  constructor(public readonly workspaceId: UUID) {}
}
