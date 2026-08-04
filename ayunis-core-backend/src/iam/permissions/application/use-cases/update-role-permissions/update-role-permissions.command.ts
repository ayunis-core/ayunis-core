import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { Permission } from '../../../domain/value-objects/permission.enum';

export class UpdateRolePermissionsCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly role: UserRole,
    public readonly permissions: Permission[],
  ) {}
}
