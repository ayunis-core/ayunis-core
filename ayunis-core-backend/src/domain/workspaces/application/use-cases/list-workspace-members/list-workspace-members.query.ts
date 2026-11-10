import type { UUID } from 'crypto';

export class ListWorkspaceMembersQuery {
  constructor(public readonly workspaceId: UUID) {}
}
