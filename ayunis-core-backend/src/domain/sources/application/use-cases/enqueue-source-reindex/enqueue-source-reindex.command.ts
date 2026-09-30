import type { UUID } from 'crypto';

export class EnqueueSourceReindexCommand {
  readonly sourceId: UUID;
  /** Org whose embedding model and crawl context the run uses. */
  readonly orgId: UUID;
  readonly userId: UUID;

  constructor(params: { sourceId: UUID; orgId: UUID; userId: UUID }) {
    this.sourceId = params.sourceId;
    this.orgId = params.orgId;
    this.userId = params.userId;
  }
}
