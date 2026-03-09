import type { SubscriptionWebhookPayload } from '../subscription-webhook-payload.types';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { WebhookEvent } from '../webhook-event.entity';

export class SubscriptionUncancelledWebhookEvent extends WebhookEvent<SubscriptionWebhookPayload> {
  readonly eventType: WebhookEventType;
  readonly data: SubscriptionWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: SubscriptionWebhookPayload) {
    super();
    this.eventType = WebhookEventType.SUBSCRIPTION_UNCANCELLED;
    this.data = payload;
    this.timestamp = new Date();
  }
}
