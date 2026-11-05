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

const BASE_PERMISSIONS: Permission[] = [
  Permission.MANAGE_OWN_SKILLS,
  Permission.INSTALL_MARKETPLACE_SKILLS,
  Permission.REQUEST_SKILL_TRANSFER,
  Permission.REQUEST_SKILL_TRANSFER_ORG,
  Permission.MANAGE_OWN_KNOWLEDGE,
  Permission.REQUEST_KNOWLEDGE_TRANSFER,
  Permission.REQUEST_KNOWLEDGE_TRANSFER_ORG,
  Permission.CREATE_WORKSPACES,
  Permission.SHARE_WORKSPACES,
];

export const DEFAULT_ROLE_PERMISSIONS: Readonly<
  Record<UserRole, Permission[]>
> = {
  [UserRole.ADMIN]: [],
  [UserRole.MANAGER]: [Permission.ASSIGN_USERS_TO_TEAMS, ...BASE_PERMISSIONS],
  [UserRole.USER]: [...BASE_PERMISSIONS],
};
