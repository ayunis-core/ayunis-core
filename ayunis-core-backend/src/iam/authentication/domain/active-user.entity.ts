import type { UUID } from 'crypto';
import type { UserRole } from '../../users/domain/value-objects/role.object';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

export class ActiveUser {
  readonly kind = 'user' as const;
  readonly id: UUID;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string;
  readonly orgId: UUID;
  readonly role: UserRole;
  readonly systemRole: SystemRole;

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
    this.name = params.name;
    this.orgId = params.orgId;
    this.role = params.role;
    this.systemRole = params.systemRole;
  }
}
