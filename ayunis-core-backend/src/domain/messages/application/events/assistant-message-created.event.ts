import type { UUID } from 'crypto';

export class AssistantMessageCreatedEvent {
  static readonly EVENT_NAME = 'message.assistant-created';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly threadId: UUID,
    public readonly messageId: UUID,
  ) {}
}
