import type { UUID } from 'crypto';
import { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';

/**
 * Emitted synchronously *before* a user row is deleted. The rows themselves
 * are removed via ON DELETE CASCADE foreign keys (see the
 * CascadeUserDeletionRelations migration), but object-storage assets (MinIO)
 * and in-flight source processing live outside the cascade and need explicit
 * cleanup.
 *
 * Listeners must not perform irreversible side effects while handling this
 * event — the row delete can still fail. They may read rows to resolve cleanup
 * targets (the cascade is about to destroy them) and must register the
 * destructive work via `deferCleanup`; the emitting use case runs the deferred
 * tasks (each error-swallowed) only after the row delete succeeds. A failed
 * delete therefore loses nothing, and a failed cleanup leaks orphaned external
 * data instead of destroying data of a still-existing user.
 */
export class UserDeletionRequestedEvent extends DeferredCleanupEvent {
  static readonly EVENT_NAME = 'user.deletion-requested';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {
    super();
  }
}
