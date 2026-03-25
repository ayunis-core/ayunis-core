import type { UUID } from 'crypto';
import type { Subscription } from '../../domain/subscription.entity';

export class SubscriptionCancelledEvent {
  static readonly EVENT_NAME = 'subscription.cancelled';

  constructor(
    public readonly orgId: UUID,
    public readonly subscription: Subscription,
  ) {}
}
