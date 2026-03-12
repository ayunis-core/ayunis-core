import type { SubscriptionWebhookPayload } from '../subscription-webhook-payload.types';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { WebhookEvent } from '../webhook-event.entity';

export class SubscriptionSeatsUpdatedWebhookEvent extends WebhookEvent<SubscriptionWebhookPayload> {
  readonly eventType: WebhookEventType;
  readonly data: SubscriptionWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: SubscriptionWebhookPayload) {
    super();
    this.eventType = WebhookEventType.SUBSCRIPTION_SEATS_UPDATED;
    this.data = payload;
    this.timestamp = new Date();
  }
}
