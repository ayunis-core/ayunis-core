import type { UUID } from 'crypto';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export abstract class WorkspaceMembersRepository {
  abstract create(member: WorkspaceMember): Promise<WorkspaceMember>;
  abstract findWorkspaceIdsByUserId(userId: UUID): Promise<UUID[]>;
  /** `null` unless the user is a member of the workspace in that org. */
  abstract findRole(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<UserRole | null>;
  /** The user's role per workspace; workspaces they are not in are absent. */
  abstract findRolesByUserId(
    userId: UUID,
    workspaceIds: UUID[],
  ): Promise<Map<UUID, UserRole>>;
  /**
   * In each of the workspaces that has members but no admin left, the
   * longest-standing member becomes admin. Locks the workspace rows first so
   * the check cannot race another membership change.
   */
  abstract promoteSuccessors(workspaceIds: UUID[]): Promise<void>;
}
