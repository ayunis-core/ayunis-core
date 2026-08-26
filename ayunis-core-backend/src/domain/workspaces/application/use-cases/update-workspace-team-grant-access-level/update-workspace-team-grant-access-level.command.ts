import type { UUID } from 'crypto';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export class UpdateWorkspaceTeamGrantAccessLevelCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly teamId: UUID,
    public readonly accessLevel: WorkspaceAccessLevel,
  ) {}
}
