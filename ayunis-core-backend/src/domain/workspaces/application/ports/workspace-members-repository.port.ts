import type { UUID } from 'crypto';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export abstract class WorkspaceMembersRepository {
  abstract create(member: WorkspaceMember): Promise<WorkspaceMember>;
  /** Skips users who are already members; returns only the added members. */
  abstract addMany(members: WorkspaceMember[]): Promise<WorkspaceMember[]>;
  /** Ordered by the date they joined, earliest first. */
  abstract findAllByWorkspaceId(workspaceId: UUID): Promise<WorkspaceMember[]>;
  abstract findOne(
    workspaceId: UUID,
    userId: UUID,
  ): Promise<WorkspaceMember | null>;
  abstract countAdmins(workspaceId: UUID): Promise<number>;
  abstract updateRole(
    workspaceId: UUID,
    userId: UUID,
    role: UserRole,
  ): Promise<void>;
  /**
   * Locks the workspace row until the surrounding transaction ends, so
   * membership changes that must keep an admin cannot interleave. Must run
   * inside a transaction.
   */
  abstract lockWorkspace(workspaceId: UUID, orgId: UUID): Promise<void>;
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
