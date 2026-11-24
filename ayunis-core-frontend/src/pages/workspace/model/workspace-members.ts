import type {
  WorkspaceMemberResponseDto,
  WorkspaceRolePermissionSetDto,
} from '@ayunis/api-client/schemas';
import { UpdateWorkspaceMemberRoleDtoRole } from '@ayunis/api-client/schemas';
import type { MemberRoleTranslation } from '@/widgets/member-role-select';
import type { WorkspaceAccess } from '@/features/workspaces';

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

/** Members leave on their own instead of removing themselves. */
export function canRemoveWorkspaceMember(
  access: WorkspaceAccess,
  member: WorkspaceMember,
  currentUserId: string | undefined,
): boolean {
  if (member.userId === currentUserId) return false;
  return member.role === 'admin' ? access.isAdmin : access.canManageMembers;
}
