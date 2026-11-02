import type { SubscriptionWebhookPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class SubscriptionCancelledWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.SUBSCRIPTION_CANCELLED
> {
  readonly eventType = WebhookEventType.SUBSCRIPTION_CANCELLED;
  readonly data: SubscriptionWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: SubscriptionWebhookPayload) {
    super();
    this.data = payload;
    this.timestamp = new Date();
  }
}
