import type { Workspace } from '@/features/workspaces/model/types';

export interface WorkspaceAccess {
  /** Edit details and instruction, skills, knowledge, activation and pins. */
  canManage: boolean;
  canManageMembers: boolean;
  /** Change roles and delete the workspace. */
  isAdmin: boolean;
}

/** What the caller may do, from the role and permissions the API returns. */
export function getWorkspaceAccess(
  workspace: Pick<Workspace, 'role' | 'permissions'>,
): WorkspaceAccess {
  return {
    canManage: workspace.permissions.includes('manage_workspace'),
    canManageMembers: workspace.permissions.includes(
      'manage_workspace_members',
    ),
    isAdmin: workspace.role === 'admin',
  };
}
