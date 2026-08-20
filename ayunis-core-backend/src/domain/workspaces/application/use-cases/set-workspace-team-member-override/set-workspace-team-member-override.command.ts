import type { UUID } from 'crypto';
import type { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export type WorkspaceTeamMemberOverrideValue =
  { role: WorkspaceRole; excluded: false } | { role: null; excluded: true };

export class SetWorkspaceTeamMemberOverrideCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly teamId: UUID,
    public readonly userId: UUID,
    public readonly value: WorkspaceTeamMemberOverrideValue,
  ) {}
}
