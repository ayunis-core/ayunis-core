import type { UUID } from 'crypto';

export class CreateAdminUserCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly orgId: UUID;
  public readonly name: string;
  public readonly emailVerified: boolean;
  public readonly hasAcceptedMarketing: boolean;
  public readonly activated: boolean;
  public readonly department?: string;

  constructor({
    email,
    password,
    orgId,
    name,
    emailVerified,
    hasAcceptedMarketing,
    activated,
    department,
  }: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
    emailVerified: boolean;
    hasAcceptedMarketing: boolean;
    activated?: boolean;
    department?: string;
  }) {
    this.email = email;
    this.password = password;
    this.orgId = orgId;
    this.name = name;
    this.emailVerified = emailVerified;
    this.hasAcceptedMarketing = hasAcceptedMarketing;
    this.activated = activated ?? true;
    this.department = department;
  }
}
