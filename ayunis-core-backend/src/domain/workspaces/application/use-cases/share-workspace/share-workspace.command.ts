import type { UUID } from 'crypto';
import type { WorkspaceGrantLevel } from 'src/domain/workspaces/domain/workspace-access-level';

export class ShareWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly userIds: UUID[],
    public readonly teamIds: UUID[],
    public readonly accessLevel: WorkspaceGrantLevel,
  ) {}
}
