import type { BillingInfoPayload } from '../subscription-webhook-payload.types';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { WebhookEvent } from '../webhook-event.entity';

export class SubscriptionBillingInfoUpdatedWebhookEvent extends WebhookEvent<BillingInfoPayload> {
  readonly eventType: WebhookEventType;
  readonly data: BillingInfoPayload;
  readonly timestamp: Date;

  constructor(payload: BillingInfoPayload) {
    super();
    this.eventType = WebhookEventType.SUBSCRIPTION_BILLING_INFO_UPDATED;
    this.data = payload;
    this.timestamp = new Date();
  }
}
