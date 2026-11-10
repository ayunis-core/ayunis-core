import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceAccess } from 'src/domain/workspaces/application/models/workspace-access.model';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { GetMyPermissionsQuery } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.query';
import { GetMyPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.use-case';
import type { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export type RolePermissionsLoader = (role: UserRole) => Promise<Permission[]>;

/**
 * Non-members, org admins included, get `WorkspaceNotFoundError`; members
 * lacking a permission get `UnauthorizedAccessError`.
 */
@Injectable()
export class WorkspaceAccessService {
  constructor(
    private readonly members: WorkspaceMembersRepository,
    private readonly getMyPermissions: GetMyPermissionsUseCase,
    private readonly context: ContextService,
  ) {}

  async requireMember(workspaceId: UUID): Promise<WorkspaceAccess> {
    const { userId, orgId } = getRequiredUserContext(this.context);
    const role = await this.members.findRole(workspaceId, userId, orgId);
    if (!role) throw new WorkspaceNotFoundError(workspaceId);
    return this.toAccess(role, this.rolePermissionsLoader());
  }

  async requirePermission(
    workspaceId: UUID,
    permission: Permission,
  ): Promise<WorkspaceAccess> {
    const access = await this.requireMember(workspaceId);
    if (!access.can(permission)) throw new UnauthorizedAccessError();
    return access;
  }

  async requireAdmin(workspaceId: UUID): Promise<WorkspaceAccess> {
    const access = await this.requireMember(workspaceId);
    if (!access.isAdmin) throw new UnauthorizedAccessError();
    return access;
  }

  /** Workspaces the user is not a member of are absent from the result. */
  async forWorkspaces(
    workspaceIds: UUID[],
  ): Promise<Map<UUID, WorkspaceAccess>> {
    const { userId } = getRequiredUserContext(this.context);
    const roles = await this.members.findRolesByUserId(userId, workspaceIds);
    const permissionsOf = this.rolePermissionsLoader();
    const entries = await Promise.all(
      [...roles].map(
        async ([workspaceId, role]) =>
          [workspaceId, await this.toAccess(role, permissionsOf)] as const,
      ),
    );
    return new Map(entries);
  }

  /** Reads each role's matrix row at most once per call. */
  rolePermissionsLoader(): RolePermissionsLoader {
    const { orgId } = getRequiredUserContext(this.context);
    const cache = new Map<UserRole, Promise<Permission[]>>();
    return (role) => {
      let permissions = cache.get(role);
      if (!permissions) {
        permissions = this.getMyPermissions.execute(
          new GetMyPermissionsQuery(orgId, role),
        );
        cache.set(role, permissions);
      }
      return permissions;
    };
  }

  async toAccess(
    role: UserRole,
    permissionsOf: RolePermissionsLoader,
  ): Promise<WorkspaceAccess> {
    if (role === UserRole.ADMIN) return WorkspaceAccess.forAdmin();
    return new WorkspaceAccess(role, await permissionsOf(role));
  }
}
