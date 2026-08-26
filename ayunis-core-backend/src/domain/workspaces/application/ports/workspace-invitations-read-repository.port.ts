import type { UUID } from 'crypto';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

export interface WorkspaceInvitation {
  workspace: Workspace;
  accessLevel: WorkspaceAccessLevel;
}

export abstract class WorkspaceInvitationsReadRepository {
  abstract findPendingByUser(
    userId: UUID,
    orgId: UUID,
  ): Promise<WorkspaceInvitation[]>;
}
