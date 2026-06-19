import type { UUID } from 'crypto';

import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class CreateInviteCommand {
  public readonly email: string;
  public readonly orgId: UUID;
  public readonly role: UserRole;
  public readonly userId: UUID;
  public readonly prepared: boolean;

  constructor(params: {
    email: string;
    orgId: UUID;
    role: UserRole;
    userId: UUID;
    prepared?: boolean;
  }) {
    this.email = params.email;
    this.orgId = params.orgId;
    this.role = params.role;
    this.userId = params.userId;
    this.prepared = params.prepared ?? false;
  }
}
