import type { UUID } from 'crypto';

export class DeleteWorkspaceCommand {
  readonly workspaceId: UUID;

  constructor(params: { workspaceId: UUID }) {
    this.workspaceId = params.workspaceId;
  }
}
