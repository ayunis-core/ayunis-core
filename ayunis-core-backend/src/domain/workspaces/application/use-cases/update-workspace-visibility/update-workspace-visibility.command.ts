import type { UUID } from 'crypto';
import type { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';

export class UpdateWorkspaceVisibilityCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly visibility: WorkspaceVisibility,
  ) {}
}
