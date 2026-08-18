import type { UUID } from 'crypto';

export class FindArtifactsByWorkspaceQuery {
  readonly workspaceId: UUID;

  constructor(params: { workspaceId: UUID }) {
    this.workspaceId = params.workspaceId;
  }
}
