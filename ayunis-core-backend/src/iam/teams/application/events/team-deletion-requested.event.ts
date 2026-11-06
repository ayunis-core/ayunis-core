import type { UUID } from 'crypto';
import { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';

/**
 * Emitted *before* a team row is deleted. Resources owned by the team go with
 * it via ON DELETE CASCADE, but some of their data (e.g. skill sources and
 * processing jobs) lives outside the cascade. Listeners resolve those targets
 * while the rows still exist and register the destructive work via
 * `deferCleanup`; the emitting use case runs it only after the delete.
 */
export class TeamDeletionRequestedEvent extends DeferredCleanupEvent {
  static readonly EVENT_NAME = 'team.deletion-requested';

  constructor(
    public readonly teamId: UUID,
    public readonly orgId: UUID,
  ) {
    super();
  }
}
