import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { Permission } from '../../domain/value-objects/permission.enum';
import type { RolePermission } from '../../domain/role-permission.entity';

export interface RoleGrant {
  role: UserRole;
  permissions: Permission[];
}

export abstract class RolePermissionsRepository {
  abstract findByOrgId(orgId: UUID): Promise<RolePermission[]>;
  abstract existsForRole(
    orgId: UUID,
    role: UserRole,
    permission: Permission,
  ): Promise<boolean>;
  /**
   * Replaces the full permission set granted to `role` in `orgId` atomically:
   * every existing grant for the role is removed and the given permissions
   * inserted in a single transaction.
   */
  abstract setForRole(
    orgId: UUID,
    role: UserRole,
    permissions: Permission[],
  ): Promise<void>;
  /**
   * Same replacement semantics as `setForRole`, but for several roles in one
   * transaction — so seeding a new org cannot leave a partially granted matrix
   * if it fails midway.
   */
  abstract setForRoles(orgId: UUID, grants: RoleGrant[]): Promise<void>;
}
