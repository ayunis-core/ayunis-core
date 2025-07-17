import { UUID } from 'crypto';
import { UserRole } from '../../../domain/value-objects/role.object';

export class CreateUserCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly orgId: UUID;
  public readonly name: string;
  public readonly role: UserRole;
  public readonly emailVerified: boolean;

  constructor({
    email,
    password,
    orgId,
    name,
    role,
    emailVerified,
  }: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
    role: UserRole;
    emailVerified: boolean;
  }) {
    this.email = email;
    this.password = password;
    this.orgId = orgId;
    this.name = name;
    this.role = role;
    this.emailVerified = emailVerified;
  }
}
