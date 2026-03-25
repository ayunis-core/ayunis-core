import type { UUID } from 'crypto';
import type { SubscriptionBillingInfo } from '../../domain/subscription-billing-info.entity';

export class SubscriptionBillingInfoUpdatedEvent {
  static readonly EVENT_NAME = 'subscription.billing-info-updated';

  constructor(
    public readonly orgId: UUID,
    public readonly subscriptionId: UUID,
    public readonly billingInfo: SubscriptionBillingInfo,
  ) {}
}
