import type { UUID } from 'crypto';

export class ToggleWorkspacePinnedCommand {
  readonly workspaceId: UUID;

  constructor(params: { workspaceId: UUID }) {
    this.workspaceId = params.workspaceId;
  }
}
