import type { UUID } from 'crypto';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';

export abstract class WorkspaceMembersRepository {
  abstract create(member: WorkspaceMember): Promise<WorkspaceMember>;
  abstract findWorkspaceIdsByUserId(userId: UUID): Promise<UUID[]>;
  /**
   * In each of the workspaces that has members but no admin left, the
   * longest-standing member becomes admin. Locks the workspace rows first so
   * the check cannot race another membership change.
   */
  abstract promoteSuccessors(workspaceIds: UUID[]): Promise<void>;
}
