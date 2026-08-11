import type { UUID } from 'crypto';

export class ReorderWorkspacesCommand {
  readonly workspaceIds: UUID[];

  constructor(params: { workspaceIds: UUID[] }) {
    this.workspaceIds = params.workspaceIds;
  }
}
