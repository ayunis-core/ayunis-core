import { randomUUID, UUID } from 'crypto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class Invite {
  public readonly id: UUID;
  public readonly email: string;
  public readonly orgId: UUID;
  public readonly role: UserRole;
  public readonly inviterId?: UUID;
  public readonly createdAt: Date;
  public acceptedAt?: Date;
  public readonly expiresAt: Date;

  constructor(params: {
    id?: UUID;
    email: string;
    orgId: UUID;
    role: UserRole;
    inviterId?: UUID;
    createdAt?: Date;
    acceptedAt?: Date;
    expiresAt: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.email = params.email;
    this.orgId = params.orgId;
    this.role = params.role;
    this.inviterId = params.inviterId;
    this.createdAt = params.createdAt ?? new Date();
    this.acceptedAt = params.acceptedAt;
    this.expiresAt = params.expiresAt;
  }
}
