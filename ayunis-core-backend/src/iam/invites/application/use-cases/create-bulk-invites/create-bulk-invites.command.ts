import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class CreateBulkInvitesCommand {
  public readonly invites: Array<{ email: string; role: UserRole }>;
  public readonly orgId: UUID;
  public readonly userId: UUID;

  constructor(params: {
    invites: Array<{ email: string; role: UserRole }>;
    orgId: UUID;
    userId: UUID;
  }) {
    this.invites = params.invites;
    this.orgId = params.orgId;
    this.userId = params.userId;
  }
}
