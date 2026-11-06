import type { UUID } from 'crypto';

export class DeleteSourcesCommand {
  constructor(
    public readonly sourceIds: UUID[],
    /** Null when the sources' org is no longer known (orphan sweep). */
    public readonly orgId: UUID | null,
  ) {}
}
