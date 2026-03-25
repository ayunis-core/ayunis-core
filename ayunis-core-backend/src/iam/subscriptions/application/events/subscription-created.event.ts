import type { UUID } from 'crypto';
import type { SubscriptionEventData } from './subscription-event-data.types';

export class SubscriptionCreatedEvent {
  static readonly EVENT_NAME = 'subscription.created';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: SubscriptionEventData,
  ) {}
}
