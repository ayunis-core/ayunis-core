import type { UUID } from 'crypto';
import type { User } from '../../domain/user.entity';

export class UserUpdatedEvent {
  static readonly EVENT_NAME = 'user.updated';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly user: User,
  ) {}
}
