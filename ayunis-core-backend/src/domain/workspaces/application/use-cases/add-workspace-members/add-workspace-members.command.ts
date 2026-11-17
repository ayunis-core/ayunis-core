import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class AddWorkspaceMembersCommand {
  readonly workspaceId: UUID;
  readonly userIds: UUID[];
  readonly role: UserRole;

  constructor(params: { workspaceId: UUID; userIds: UUID[]; role: UserRole }) {
    this.workspaceId = params.workspaceId;
    this.userIds = params.userIds;
    this.role = params.role;
  }
}
