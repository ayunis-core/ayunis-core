import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { Org } from 'src/iam/orgs/domain/org.entity';

export class User {
  public id: UUID;
  public email: string;
  public emailVerified: boolean;
  public passwordHash: string;
  public role: UserRole;
  public orgId: UUID;
  public name: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    email: string;
    emailVerified: boolean;
    passwordHash: string;
    role: UserRole;
    orgId: UUID;
    org?: Org;
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.email = params.email;
    this.emailVerified = params.emailVerified;
    this.passwordHash = params.passwordHash;
    this.role = params.role;
    this.orgId = params.orgId;
    this.name = params.name;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
