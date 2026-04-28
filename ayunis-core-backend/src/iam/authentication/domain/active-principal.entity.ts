import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

export type PrincipalKind = 'user' | 'apiKey';

/**
 * Authenticated caller of a request — either a logged-in user or an API key.
 * Subclasses (`ActiveUser`, `ActiveApiKey`) carry the principal-specific fields.
 */
export abstract class ActivePrincipal {
  abstract readonly kind: PrincipalKind;
  readonly orgId: UUID;
  readonly role: UserRole;
  readonly systemRole: SystemRole;

  constructor(params: { orgId: UUID; role: UserRole; systemRole: SystemRole }) {
    this.orgId = params.orgId;
    this.role = params.role;
    this.systemRole = params.systemRole;
  }
}
