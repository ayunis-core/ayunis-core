import { UUID } from 'crypto';

export class CreateRegularUserCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly orgId: UUID;
  public readonly name: string;

  constructor(params: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
  }) {
    this.email = params.email;
    this.password = params.password;
    this.orgId = params.orgId;
    this.name = params.name;
  }
}
