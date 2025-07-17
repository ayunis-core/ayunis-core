import { UUID } from 'crypto';

export class CreateAdminUserCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly orgId: UUID;
  public readonly name: string;
  public readonly emailVerified: boolean;

  constructor({
    email,
    password,
    orgId,
    name,
    emailVerified,
  }: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
    emailVerified: boolean;
  }) {
    this.email = email;
    this.password = password;
    this.orgId = orgId;
    this.name = name;
    this.emailVerified = emailVerified;
  }
}
