import type { UUID } from 'crypto';

export class RemoveWorkspaceTeamGrantCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly teamId: UUID,
  ) {}
}
