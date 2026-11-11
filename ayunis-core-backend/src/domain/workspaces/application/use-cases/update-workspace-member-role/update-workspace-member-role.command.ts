import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class UpdateWorkspaceMemberRoleCommand {
  readonly workspaceId: UUID;
  readonly userId: UUID;
  readonly role: UserRole;

  constructor(params: { workspaceId: UUID; userId: UUID; role: UserRole }) {
    this.workspaceId = params.workspaceId;
    this.userId = params.userId;
    this.role = params.role;
  }
}
