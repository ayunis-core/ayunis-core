import { UUID } from 'crypto';

import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class CreateInviteCommand {
  public readonly email: string;
  public readonly orgId: UUID;
  public readonly role: UserRole;
  public readonly userId: UUID;

  constructor(params: {
    email: string;
    orgId: UUID;
    role: UserRole;
    userId: UUID;
  }) {
    this.email = params.email;
    this.orgId = params.orgId;
    this.role = params.role;
    this.userId = params.userId;
  }
}
