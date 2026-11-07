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
 * existing orgs by the CreateRolePermissions and GrantManageRoutines
 * migrations). Chosen to preserve the pre-RBAC behaviour where any member could
 * manage skills and knowledge bases, and to let every member use routines;
 * team management stays admin-only until an admin grants it.
 *
 * Keep in sync with the backfill VALUES lists in those migrations — a
 * migration cannot import this module.
 */
export const DEFAULT_ROLE_PERMISSIONS: Readonly<
  Record<UserRole, Permission[]>
> = {
  [UserRole.ADMIN]: [],
  [UserRole.MANAGER]: [
    Permission.MANAGE_SKILLS,
    Permission.SHARE_SKILLS_WITH_TEAMS,
    Permission.SHARE_SKILLS_WITH_ORG,
    Permission.MANAGE_KNOWLEDGE_BASES,
    Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
    Permission.SHARE_KNOWLEDGE_BASES_WITH_ORG,
    Permission.MANAGE_ROUTINES,
  ],
  [UserRole.USER]: [
    Permission.MANAGE_SKILLS,
    Permission.SHARE_SKILLS_WITH_TEAMS,
    Permission.SHARE_SKILLS_WITH_ORG,
    Permission.MANAGE_KNOWLEDGE_BASES,
    Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
    Permission.SHARE_KNOWLEDGE_BASES_WITH_ORG,
    Permission.MANAGE_ROUTINES,
  ],
};
