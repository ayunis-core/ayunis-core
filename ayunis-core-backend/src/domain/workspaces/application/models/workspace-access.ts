import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';

export interface WorkspaceAccess {
  workspace: Workspace;
  level: WorkspaceAccessLevel;
}
