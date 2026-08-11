import type { UUID } from 'crypto';
import { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';

/**
 * Emitted synchronously *before* a workspace row is deleted. The workspace's
 * threads (and their messages and artifacts) go with it via the
 * `threads.workspaceId` ON DELETE CASCADE, but object-storage assets (MinIO)
 * live outside the cascade and need explicit cleanup.
 *
 * Listeners resolve their cleanup targets while the rows still exist and
 * register the destructive work via `deferCleanup`; the emitting use case runs
 * the deferred tasks only after the row delete succeeds.
 */
export class WorkspaceDeletionRequestedEvent extends DeferredCleanupEvent {
  static readonly EVENT_NAME = 'workspace.deletion-requested';

  constructor(
    public readonly workspaceId: UUID,
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {
    super();
  }
}
