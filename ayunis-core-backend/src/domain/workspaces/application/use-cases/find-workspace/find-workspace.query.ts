import type { UUID } from 'crypto';

export class FindWorkspaceQuery {
  readonly workspaceId: UUID;

  constructor(params: { workspaceId: UUID }) {
    this.workspaceId = params.workspaceId;
  }
}
