import type { UUID } from 'crypto';

export class UserDeletedEvent {
  static readonly EVENT_NAME = 'user.deleted';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
