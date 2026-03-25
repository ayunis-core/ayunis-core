import type { UUID } from 'crypto';
import type { SubscriptionEventData } from './subscription-event-data.types';

export class SubscriptionSeatsUpdatedEvent {
  static readonly EVENT_NAME = 'subscription.seats-updated';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: SubscriptionEventData,
  ) {}
}
