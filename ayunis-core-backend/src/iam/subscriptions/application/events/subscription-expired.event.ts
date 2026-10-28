import type { UUID } from 'crypto';
import type { SubscriptionEventData } from './subscription-event-data.types';

// Emitted once a fixed access end has passed on a subscription that was never
// cancelled; cancellations are announced by SubscriptionCancelledEvent instead.
export class SubscriptionExpiredEvent {
  static readonly EVENT_NAME = 'subscription.expired';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: SubscriptionEventData,
  ) {}
}
