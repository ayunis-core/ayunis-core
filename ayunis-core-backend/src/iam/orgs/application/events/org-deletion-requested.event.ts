import type { UUID } from 'crypto';
import { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';

/**
 * Emitted synchronously *before* an organization row is deleted. Relational
 * rows and pgvector embeddings are removed by the org `ON DELETE CASCADE`
 * chain (see the AddOrgCascadeToConversationKbMcpData migration), but
 * object-storage assets (MinIO) live outside the database and must be purged
 * explicitly.
 *
 * Listeners may perform read-only preflight checks and throw to reject the
 * deletion before any rows are removed. They must register irreversible work
 * via `deferCleanup`; the emitting use case runs those tasks only after the row
 * delete succeeds. A deferred cleanup failure cannot restore the deleted rows,
 * so callers that require complete cleanup receive an error describing the
 * remaining external data.
 */
export class OrgDeletionRequestedEvent extends DeferredCleanupEvent {
  static readonly EVENT_NAME = 'org.deletion-requested';

  constructor(public readonly orgId: UUID) {
    super();
  }
}
