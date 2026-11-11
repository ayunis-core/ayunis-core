import type { UUID } from 'crypto';

export class DeleteExpiredThreadCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly threadId: UUID,
    /** The chat's creator, as returned with the expired thread reference. */
    public readonly userId: UUID,
  ) {}
}
