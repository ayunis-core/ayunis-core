import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

export class ActiveUser {
  readonly id: UUID;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly role: UserRole;
  readonly systemRole: SystemRole;
  readonly orgId: UUID;
  readonly name: string;
  /** Token client the session belongs to; null for browser sessions. */
  readonly client: SessionClient | null;

  constructor(params: {
    id: UUID;
    email: string;
    emailVerified: boolean;
    role: UserRole;
    systemRole: SystemRole;
    orgId: UUID;
    name: string;
    client?: SessionClient | null;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.emailVerified = params.emailVerified;
    this.role = params.role;
    this.systemRole = params.systemRole;
    this.orgId = params.orgId;
    this.name = params.name;
    this.client = params.client ?? null;
  }
}
