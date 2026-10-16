import type { UUID } from 'crypto';

export class ListLinkableWorkspaceSkillsQuery {
  constructor(
    public readonly workspaceId: UUID,
    public readonly search?: string,
  ) {}
}
