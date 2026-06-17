import type { UUID } from 'crypto';
import type { User } from '../../domain/user.entity';

export class UserCreatedEvent {
  static readonly EVENT_NAME = 'user.created';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly user: User,
  ) {}
}
