import type { UUID } from 'crypto';

/**
 * Shared shape for role-agnostic user-creation commands. The concrete role is
 * assigned by the wrapping use case (admin vs regular), so the command itself
 * carries everything except the role.
 */
export abstract class CreateUserBaseCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly orgId: UUID;
  public readonly name: string;
  public readonly emailVerified: boolean;
  public readonly hasAcceptedMarketing: boolean;
  public readonly department?: string;

  constructor(params: {
    email: string;
    password: string;
    orgId: UUID;
    name: string;
    emailVerified: boolean;
    hasAcceptedMarketing: boolean;
    department?: string;
  }) {
    this.email = params.email;
    this.password = params.password;
    this.orgId = params.orgId;
    this.name = params.name;
    this.emailVerified = params.emailVerified;
    this.hasAcceptedMarketing = params.hasAcceptedMarketing;
    this.department = params.department;
  }
}
