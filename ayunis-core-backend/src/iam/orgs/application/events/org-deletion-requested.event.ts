import type { UUID } from 'crypto';
import { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';

/**
 * Emitted synchronously *before* an organization row is deleted. Relational
 * rows and pgvector embeddings are removed by the org `ON DELETE CASCADE`
 * chain (see the AddOrgCascadeToConversationKbMcpData migration), but
 * object-storage assets (MinIO) live outside the database and must be purged
 * explicitly.
 *
 * Listeners must not perform irreversible side effects while handling this
 * event — the row delete can still fail. They may read rows to resolve cleanup
 * targets and must register the destructive work via `deferCleanup`; the
 * emitting use case runs the deferred tasks (each error-swallowed) only after
 * the row delete succeeds. A failed delete therefore loses nothing, and a
 * failed cleanup leaks orphaned blobs instead of destroying data of a
 * still-existing org.
 */
export class OrgDeletionRequestedEvent extends DeferredCleanupEvent {
  static readonly EVENT_NAME = 'org.deletion-requested';

  constructor(public readonly orgId: UUID) {
    super();
  }
}
