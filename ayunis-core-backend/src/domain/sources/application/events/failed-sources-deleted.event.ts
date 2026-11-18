import type { UUID } from 'crypto';

/**
 * Emitted inside the transaction that deleted FAILED sources at a user's
 * request, one at a time or all failed documents of a knowledge base.
 * Listeners run in that transaction; a listener that fails rolls the deletion
 * back.
 */
export class FailedSourcesDeletedEvent {
  static readonly EVENT_NAME = 'source.failed-sources-deleted';

  constructor(public readonly sourceIds: UUID[]) {}
}
