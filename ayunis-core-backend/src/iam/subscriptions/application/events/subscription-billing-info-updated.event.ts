import type { UUID } from 'crypto';
import type { BillingInfoEventData } from './subscription-event-data.types';

export class SubscriptionBillingInfoUpdatedEvent {
  static readonly EVENT_NAME = 'subscription.billing-info-updated';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: BillingInfoEventData,
  ) {}
}
