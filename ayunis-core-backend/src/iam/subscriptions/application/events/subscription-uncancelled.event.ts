import type { UUID } from 'crypto';
import type { SubscriptionEventData } from './subscription-event-data.types';

export class SubscriptionUncancelledEvent {
  static readonly EVENT_NAME = 'subscription.uncancelled';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: SubscriptionEventData,
  ) {}
}
