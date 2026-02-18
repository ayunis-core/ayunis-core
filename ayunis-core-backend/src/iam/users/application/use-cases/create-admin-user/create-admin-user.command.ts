import { UUID } from 'crypto';

export class CreateAdminUserCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly orgId: UUID;
  public readonly name: string;
  public readonly emailVerified: boolean;
  public readonly hasAcceptedMarketing: boolean;

  constructor({
    email,
    password,
    orgId,
    name,
    emailVerified,
    hasAcceptedMarketing,
  }: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
    emailVerified: boolean;
    hasAcceptedMarketing: boolean;
  }) {
    this.email = email;
    this.password = password;
    this.orgId = orgId;
    this.name = name;
    this.emailVerified = emailVerified;
    this.hasAcceptedMarketing = hasAcceptedMarketing;
  }
}
