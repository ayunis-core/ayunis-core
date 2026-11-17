import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

/** The permissions a workspace role can grant within its workspace. */
export const WORKSPACE_SCOPED_PERMISSIONS: ReadonlyArray<Permission> = [
  Permission.MANAGE_WORKSPACE,
  Permission.MANAGE_WORKSPACE_MEMBERS,
];

export const WORKSPACE_ROLES: ReadonlyArray<UserRole> = [
  UserRole.USER,
  UserRole.MANAGER,
  UserRole.ADMIN,
];

/**
 * What a member may do in one workspace. Only their workspace role counts:
 * an admin holds every workspace-scoped permission, any other role the
 * workspace-scoped part of its row in the organisation's role matrix.
 */
export class WorkspaceAccess {
  readonly role: UserRole;
  readonly permissions: Permission[];

  constructor(role: UserRole, rolePermissions: Iterable<Permission>) {
    const granted = new Set(rolePermissions);
    this.role = role;
    this.permissions = WORKSPACE_SCOPED_PERMISSIONS.filter(
      (permission) => role === UserRole.ADMIN || granted.has(permission),
    );
  }

  static forAdmin(): WorkspaceAccess {
    return new WorkspaceAccess(UserRole.ADMIN, []);
  }

  can(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}

export interface AccessibleWorkspace {
  workspace: Workspace;
  access: WorkspaceAccess;
}
