import { UUID } from 'crypto';

export class CreateAdminUserCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly orgId: UUID;
  public readonly name: string;

  constructor({
    email,
    password,
    orgId,
    name,
  }: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
  }) {
    this.email = email;
    this.password = password;
    this.orgId = orgId;
    this.name = name;
  }
}
