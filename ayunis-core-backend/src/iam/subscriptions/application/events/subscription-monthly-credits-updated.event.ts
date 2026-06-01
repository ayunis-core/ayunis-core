import type { UUID } from 'crypto';
import type { UsageBasedSubscriptionEventData } from './subscription-event-data.types';

export class SubscriptionMonthlyCreditsUpdatedEvent {
  static readonly EVENT_NAME = 'subscription.monthly-credits-updated';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: UsageBasedSubscriptionEventData,
  ) {}
}
