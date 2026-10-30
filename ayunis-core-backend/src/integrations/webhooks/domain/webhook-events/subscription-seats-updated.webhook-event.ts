import type { SubscriptionWebhookPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class SubscriptionSeatsUpdatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.SUBSCRIPTION_SEATS_UPDATED
> {
  readonly eventType = WebhookEventType.SUBSCRIPTION_SEATS_UPDATED;
  readonly data: SubscriptionWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: SubscriptionWebhookPayload) {
    super();
    this.data = payload;
    this.timestamp = new Date();
  }
}
