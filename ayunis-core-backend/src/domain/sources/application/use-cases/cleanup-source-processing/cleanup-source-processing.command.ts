import type { UUID } from 'crypto';

export class CleanupSourceProcessingCommand {
  constructor(
    public readonly sourceIds: UUID[],
    public readonly orgId: UUID,
  ) {}
}
