import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class UpdateTeamMemberRoleCommand {
  public readonly teamId: UUID;
  public readonly userId: UUID;
  public readonly role: UserRole;

  constructor(params: { teamId: UUID; userId: UUID; role: UserRole }) {
    this.teamId = params.teamId;
    this.userId = params.userId;
    this.role = params.role;
  }
}
