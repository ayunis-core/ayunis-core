import type { UUID } from 'crypto';

/**
 * Emitted synchronously *before* a user row is deleted, so that listeners can
 * purge dependent data that cannot be removed by database cascades — namely
 * object-storage assets (MinIO) and RAG index entries. The rows themselves are
 * removed afterwards via ON DELETE CASCADE foreign keys (see the
 * CascadeUserDeletionRelations migration).
 *
 * Listeners must be resilient: a failure to clean an external asset should be
 * logged, not propagated, so that user deletion itself is never blocked by a
 * transient storage/index error.
 */
export class UserDeletionRequestedEvent {
  static readonly EVENT_NAME = 'user.deletion-requested';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
