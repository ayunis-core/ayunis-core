import type { UUID } from 'crypto';

export class ListWorkspaceMemberCandidatesQuery {
  constructor(
    public readonly workspaceId: UUID,
    public readonly search?: string,
  ) {}
}
