import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class GetMyPermissionsQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly role: UserRole,
  ) {}
}
