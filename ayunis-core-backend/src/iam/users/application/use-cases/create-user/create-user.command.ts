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

  constructor({
    email,
    password,
    orgId,
    name,
    role,
    emailVerified,
    hasAcceptedMarketing,
    department,
  }: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
    role: UserRole;
    emailVerified: boolean;
    hasAcceptedMarketing: boolean;
    department?: string;
  }) {
    this.email = email;
    this.password = password;
    this.orgId = orgId;
    this.name = name;
    this.role = role;
    this.emailVerified = emailVerified;
    this.hasAcceptedMarketing = hasAcceptedMarketing;
    this.department = department;
  }
}
