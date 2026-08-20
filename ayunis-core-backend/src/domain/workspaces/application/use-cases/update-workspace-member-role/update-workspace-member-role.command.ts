import type { UUID } from 'crypto';
import type { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export class UpdateWorkspaceMemberRoleCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly userId: UUID,
    public readonly role: WorkspaceRole,
  ) {}
}
