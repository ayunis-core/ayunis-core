import { UUID } from 'crypto';
import { UserRole } from '../../users/domain/value-objects/role.object';

export class ActiveUser {
  readonly id: UUID;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly role: UserRole;
  readonly orgId: UUID;
  readonly name: string;

  constructor(params: {
    id: UUID;
    email: string;
    emailVerified: boolean;
    role: UserRole;
    orgId: UUID;
    name: string;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.emailVerified = params.emailVerified;
    this.role = params.role;
    this.orgId = params.orgId;
    this.name = params.name;
  }
}
