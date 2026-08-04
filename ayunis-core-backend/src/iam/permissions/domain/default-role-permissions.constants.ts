import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from './value-objects/permission.enum';

/**
 * Roles whose permissions org admins configure. ADMIN is intentionally absent:
 * admins implicitly hold every permission and cannot be restricted.
 */
export const CONFIGURABLE_ROLES: ReadonlyArray<UserRole> = [
  UserRole.MANAGER,
  UserRole.USER,
];

export const isConfigurableRole = (role: UserRole): boolean =>
  CONFIGURABLE_ROLES.includes(role);

/**
 * Defaults granted to a role when an org is created (and backfilled onto
 * existing orgs by the CreateRolePermissions migration). Chosen to preserve the
 * pre-RBAC behaviour where any member could manage skills and knowledge bases;
 * team management stays admin-only until an admin grants it.
 *
 * Keep in sync with the backfill VALUES list in the CreateRolePermissions
 * migration — the migration cannot import this module.
 */
export const DEFAULT_ROLE_PERMISSIONS: Readonly<
  Record<UserRole, Permission[]>
> = {
  [UserRole.ADMIN]: [],
  [UserRole.MANAGER]: [
    Permission.MANAGE_SKILLS,
    Permission.SHARE_SKILLS,
    Permission.MANAGE_KNOWLEDGE_BASES,
    Permission.SHARE_KNOWLEDGE_BASES,
  ],
  [UserRole.USER]: [
    Permission.MANAGE_SKILLS,
    Permission.SHARE_SKILLS,
    Permission.MANAGE_KNOWLEDGE_BASES,
    Permission.SHARE_KNOWLEDGE_BASES,
  ],
};
