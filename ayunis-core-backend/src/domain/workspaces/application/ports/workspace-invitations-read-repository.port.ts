import type { UUID } from 'crypto';
import type { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

export interface WorkspaceInvitation {
  workspace: Workspace;
  role: WorkspaceRole;
}

export abstract class WorkspaceInvitationsReadRepository {
  abstract findPendingByUser(
    userId: UUID,
    orgId: UUID,
  ): Promise<WorkspaceInvitation[]>;
}
