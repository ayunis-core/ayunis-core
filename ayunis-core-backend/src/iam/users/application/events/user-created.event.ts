import type { UUID } from 'crypto';

export class UserCreatedEvent {
  static readonly EVENT_NAME = 'user.created';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
