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
  public expiresAt: Date;
  /**
   * Whether the invite was created without sending the invitation email yet
   * (a "prepared" invite). Prepared invites can be created in advance and
   * dispatched later in bulk once the organization is ready to go live.
   */
  public prepared: boolean;

  constructor(params: {
    id?: UUID;
    email: string;
    orgId: UUID;
    role: UserRole;
    inviterId?: UUID;
    createdAt?: Date;
    acceptedAt?: Date;
    expiresAt: Date;
    prepared?: boolean;
  }) {
    this.id = params.id ?? randomUUID();
    this.email = params.email;
    this.orgId = params.orgId;
    this.role = params.role;
    this.inviterId = params.inviterId;
    this.createdAt = params.createdAt ?? new Date();
    this.acceptedAt = params.acceptedAt;
    this.expiresAt = params.expiresAt;
    this.prepared = params.prepared ?? false;
  }

  /**
   * Mark a prepared invite as sent, refreshing its expiration window so the
   * accept link stays valid from the moment it is actually dispatched.
   */
  markAsSent(expiresAt: Date): void {
    this.prepared = false;
    this.expiresAt = expiresAt;
  }
}
