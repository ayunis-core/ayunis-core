import type { UUID } from 'crypto';
import type { Subscription } from '../../domain/subscription.entity';

export class SubscriptionSeatsUpdatedEvent {
  static readonly EVENT_NAME = 'subscription.seats-updated';

  constructor(
    public readonly orgId: UUID,
    public readonly subscription: Subscription,
  ) {}
}
