import type { UUID } from 'crypto';
import type { UserRole } from '../../../domain/value-objects/role.object';

export class CreateUserCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly orgId: UUID;
  public readonly name: string;
  public readonly role: UserRole;
  public readonly emailVerified: boolean;
  public readonly hasAcceptedMarketing: boolean;
  public readonly department?: string;

  constructor(params: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
    role: UserRole;
    emailVerified: boolean;
    hasAcceptedMarketing: boolean;
    department?: string;
  }) {
    this.email = params.email;
    this.password = params.password;
    this.orgId = params.orgId;
    this.name = params.name;
    this.role = params.role;
    this.emailVerified = params.emailVerified;
    this.hasAcceptedMarketing = params.hasAcceptedMarketing;
    this.department = params.department;
  }
}
