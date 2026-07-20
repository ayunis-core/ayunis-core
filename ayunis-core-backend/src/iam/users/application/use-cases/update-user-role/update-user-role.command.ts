import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class UpdateUserRoleCommand {
  constructor(
    public readonly userId: UUID,
    public readonly newRole: UserRole,
  ) {}
}
