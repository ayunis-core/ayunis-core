import type { UUID } from 'crypto';
import type { UserRole } from '../../users/domain/value-objects/role.object';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

export class ActiveUser {
  readonly id: UUID;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly role: UserRole;
  readonly systemRole: SystemRole;
  readonly orgId: UUID;
  readonly name: string;

  constructor(params: {
    id: UUID;
    email: string;
    emailVerified: boolean;
    role: UserRole;
    systemRole: SystemRole;
    orgId: UUID;
    name: string;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.emailVerified = params.emailVerified;
    this.role = params.role;
    this.systemRole = params.systemRole;
    this.orgId = params.orgId;
    this.name = params.name;
  }
}
