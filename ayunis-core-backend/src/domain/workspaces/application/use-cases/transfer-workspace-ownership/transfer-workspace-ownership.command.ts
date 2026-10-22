import type { UUID } from 'crypto';

export class TransferWorkspaceOwnershipCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly userId: UUID,
  ) {}
}
