import type { UUID } from 'crypto';

export class FindUnreferencedSourceIdsQuery {
  constructor(
    public readonly candidateIds: UUID[],
    public readonly olderThan: Date,
    /** Only for candidates whose thread assignments are already known to be stale. */
    public readonly ignoreThreadAssignments = false,
  ) {}
}
