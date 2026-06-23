import type { UUID } from 'crypto';

export class FindExpiredThreadRefsByOrgQuery {
  constructor(
    public readonly orgId: UUID,
    /** Threads whose last activity is strictly before this are expired. */
    public readonly activeBefore: Date,
    public readonly limit: number,
    public readonly offset: number,
  ) {}
}
