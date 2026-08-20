import type { UUID } from 'crypto';

export class RemoveWorkspaceMemberCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly userId: UUID,
  ) {}
}
