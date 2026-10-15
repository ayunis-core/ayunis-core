import type { UUID } from 'crypto';

export class EndWorkspaceTeamSharingCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly teamId: UUID,
  ) {}
}
