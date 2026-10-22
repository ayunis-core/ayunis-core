import type { UUID } from 'crypto';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';

export abstract class WorkspaceSharingRepository {
  abstract loadMany(
    workspaces: Workspace[],
  ): Promise<Map<UUID, WorkspaceSharing>>;
  abstract save(sharing: WorkspaceSharing): Promise<void>;
}
