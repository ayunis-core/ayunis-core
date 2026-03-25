import type { UUID } from 'crypto';
import type { BillingInfoPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';

export class SubscriptionBillingInfoUpdatedEvent {
  static readonly EVENT_NAME = 'subscription.billing-info-updated';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: BillingInfoPayload,
  ) {}
}
