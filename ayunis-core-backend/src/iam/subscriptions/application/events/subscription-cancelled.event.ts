import type { UUID } from 'crypto';
import type { SubscriptionEventData } from './subscription-event-data.types';

export class SubscriptionCancelledEvent {
  static readonly EVENT_NAME = 'subscription.cancelled';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: SubscriptionEventData,
  ) {}
}
