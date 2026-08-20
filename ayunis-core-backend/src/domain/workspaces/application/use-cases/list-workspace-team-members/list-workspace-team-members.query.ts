import type { UUID } from 'crypto';

export class ListWorkspaceTeamMembersQuery {
  constructor(
    public readonly workspaceId: UUID,
    public readonly teamId: UUID,
  ) {}
}
