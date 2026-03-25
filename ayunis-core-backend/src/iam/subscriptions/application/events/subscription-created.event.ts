import type { UUID } from 'crypto';
import type { Subscription } from '../../domain/subscription.entity';

export class SubscriptionCreatedEvent {
  static readonly EVENT_NAME = 'subscription.created';

  constructor(
    public readonly orgId: UUID,
    public readonly subscription: Subscription,
  ) {}
}
