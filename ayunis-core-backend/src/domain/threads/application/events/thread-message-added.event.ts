import type { UUID } from 'crypto';

export class ThreadMessageAddedEvent {
  static readonly EVENT_NAME = 'thread.message-added';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly threadId: UUID,
    public readonly messageCount: number,
  ) {}
}
