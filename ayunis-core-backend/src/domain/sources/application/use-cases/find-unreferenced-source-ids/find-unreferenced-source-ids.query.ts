import type { UUID } from 'crypto';

export class FindUnreferencedSourceIdsQuery {
  constructor(
    public readonly candidateIds: UUID[],
    public readonly olderThan: Date,
  ) {}
}
