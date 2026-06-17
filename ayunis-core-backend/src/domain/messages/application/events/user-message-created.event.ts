import type { UUID } from 'crypto';

export class UserMessageCreatedEvent {
  static readonly EVENT_NAME = 'message.user-created';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly threadId: UUID,
    public readonly messageId: UUID,
  ) {}
}
