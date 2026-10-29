import type { BillingInfoPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class SubscriptionBillingInfoUpdatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.SUBSCRIPTION_BILLING_INFO_UPDATED
> {
  readonly eventType = WebhookEventType.SUBSCRIPTION_BILLING_INFO_UPDATED;
  readonly data: BillingInfoPayload;
  readonly timestamp: Date;

  constructor(payload: BillingInfoPayload) {
    super();
    this.data = payload;
    this.timestamp = new Date();
  }
}
