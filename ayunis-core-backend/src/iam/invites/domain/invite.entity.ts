import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class Invite {
  public readonly id: UUID;
  public readonly email: string;
  public readonly orgId: UUID;
  public readonly role: UserRole;
  public readonly inviterId?: UUID;
  public readonly createdAt: Date;
  public acceptedAt?: Date;
  public readonly expiresAt: Date;
  public readonly teamIds: UUID[];

  constructor(params: {
    id?: UUID;
    email: string;
    orgId: UUID;
    role: UserRole;
    inviterId?: UUID;
    createdAt?: Date;
    acceptedAt?: Date;
    expiresAt: Date;
    teamIds?: UUID[];
  }) {
    this.id = params.id ?? randomUUID();
    this.email = params.email;
    this.orgId = params.orgId;
    this.role = params.role;
    this.inviterId = params.inviterId;
    this.createdAt = params.createdAt ?? new Date();
    this.acceptedAt = params.acceptedAt;
    this.expiresAt = params.expiresAt;
    this.teamIds = [...new Set(params.teamIds ?? [])];
  }
}
