import type { UUID } from 'crypto';
import type { WorkspaceGrantLevel } from 'src/domain/workspaces/domain/workspace-access-level';

export class SetWorkspaceMemberAccessCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly userId: UUID,
    public readonly accessLevel: WorkspaceGrantLevel,
    public readonly teamId?: UUID,
  ) {}
}
