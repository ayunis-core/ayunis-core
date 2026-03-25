import type { UUID } from 'crypto';
import type { Subscription } from '../../domain/subscription.entity';

export class SubscriptionUncancelledEvent {
  static readonly EVENT_NAME = 'subscription.uncancelled';

  constructor(
    public readonly orgId: UUID,
    public readonly subscription: Subscription,
  ) {}
}
