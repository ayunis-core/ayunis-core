import type { UUID } from 'crypto';
import { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';

export class ThreadDeletionRequestedEvent extends DeferredCleanupEvent {
  static readonly EVENT_NAME = 'thread.deletion-requested';

  constructor(
    public readonly threadId: UUID,
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {
    super();
  }
}
