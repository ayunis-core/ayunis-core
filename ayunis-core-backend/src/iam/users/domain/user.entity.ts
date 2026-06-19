import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { Org } from 'src/iam/orgs/domain/org.entity';

export class User {
  public id: UUID;
  public email: string;
  public emailVerified: boolean;
  public passwordHash: string;
  public role: UserRole;
  public systemRole: SystemRole;
  public orgId: UUID;
  public name: string;
  public hasAcceptedMarketing: boolean;
  public department?: string;
  public onboardingCompletedStepIds: string[];
  public onboardingHidden: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    email: string;
    emailVerified: boolean;
    passwordHash: string;
    role: UserRole;
    systemRole?: SystemRole;
    orgId: UUID;
    org?: Org;
    name: string;
    hasAcceptedMarketing: boolean;
    department?: string;
    onboardingCompletedStepIds?: string[];
    onboardingHidden?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.email = params.email;
    this.emailVerified = params.emailVerified;
    this.passwordHash = params.passwordHash;
    this.role = params.role;
    this.systemRole = params.systemRole ?? SystemRole.CUSTOMER;
    this.orgId = params.orgId;
    this.name = params.name;
    this.hasAcceptedMarketing = params.hasAcceptedMarketing;
    this.department = params.department;
    this.onboardingCompletedStepIds = params.onboardingCompletedStepIds ?? [];
    this.onboardingHidden = params.onboardingHidden ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
