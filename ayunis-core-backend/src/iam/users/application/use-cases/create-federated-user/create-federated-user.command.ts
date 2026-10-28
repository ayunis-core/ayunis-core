import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class CreateFederatedUserCommand {
  readonly email: string;
  readonly name: string;
  readonly orgId: UUID;
  readonly role: UserRole;

  constructor(params: {
    email: string;
    name: string;
    orgId: UUID;
    role: UserRole;
  }) {
    this.email = params.email;
    this.name = params.name;
    this.orgId = params.orgId;
    this.role = params.role;
  }
}
