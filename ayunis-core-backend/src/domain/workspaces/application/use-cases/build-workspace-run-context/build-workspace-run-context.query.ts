import type { UUID } from 'crypto';

export class BuildWorkspaceRunContextQuery {
  constructor(public readonly workspaceId: UUID) {}
}
