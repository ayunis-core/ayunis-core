import type { UUID } from 'crypto';

export class ResetWorkspaceTeamMemberOverrideCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly teamId: UUID,
    public readonly userId: UUID,
  ) {}
}
