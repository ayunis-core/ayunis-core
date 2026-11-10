import type {
  WorkspaceMemberResponseDto,
  WorkspaceRolePermissionSetDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { UpdateWorkspaceMemberRoleDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { MemberRoleTranslation } from '@/widgets/member-role-select';

export type WorkspaceMember = WorkspaceMemberResponseDto;
export type WorkspaceRole = UpdateWorkspaceMemberRoleDtoRole;
export type WorkspaceRolePermissionSet = WorkspaceRolePermissionSetDto;

export const WORKSPACE_ROLES: readonly WorkspaceRole[] = [
  UpdateWorkspaceMemberRoleDtoRole.user,
  UpdateWorkspaceMemberRoleDtoRole.manager,
  UpdateWorkspaceMemberRoleDtoRole.admin,
];

/** Only workspace admins may make someone an admin. */
export const NON_ADMIN_ASSIGNABLE_ROLES: readonly WorkspaceRole[] = [
  UpdateWorkspaceMemberRoleDtoRole.user,
  UpdateWorkspaceMemberRoleDtoRole.manager,
];

export const WORKSPACE_ROLE_TRANSLATION: MemberRoleTranslation = {
  namespace: 'workspace',
  keyPrefix: 'members.role',
};

// Not a matrix permission: the backend reserves changing roles and deleting
// the workspace for workspace admins.
export const WORKSPACE_ADMIN_ONLY_ITEMS = ['manage_roles'];
