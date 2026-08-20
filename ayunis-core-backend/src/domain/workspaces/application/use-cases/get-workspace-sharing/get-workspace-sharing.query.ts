import type { UUID } from 'crypto';

export class GetWorkspaceSharingQuery {
  constructor(public readonly workspaceId: UUID) {}
}
