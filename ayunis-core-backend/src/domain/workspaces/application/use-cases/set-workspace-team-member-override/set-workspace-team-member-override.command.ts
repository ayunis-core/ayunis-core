import type { UUID } from 'crypto';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export type WorkspaceTeamMemberOverrideValue =
  | { accessLevel: WorkspaceAccessLevel; excluded: false }
  | { accessLevel: null; excluded: true };

export class SetWorkspaceTeamMemberOverrideCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly teamId: UUID,
    public readonly userId: UUID,
    public readonly value: WorkspaceTeamMemberOverrideValue,
  ) {}
}
