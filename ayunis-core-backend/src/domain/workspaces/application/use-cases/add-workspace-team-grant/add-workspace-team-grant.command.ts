import type { UUID } from 'crypto';
import type { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export class AddWorkspaceTeamGrantCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly teamId: UUID,
    public readonly role: WorkspaceRole,
  ) {}
}
