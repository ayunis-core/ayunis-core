import type { UUID } from 'crypto';
import type { SubscriptionWebhookPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class SubscriptionExpiredWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.SUBSCRIPTION_EXPIRED
> {
  override readonly id: UUID;
  readonly eventType = WebhookEventType.SUBSCRIPTION_EXPIRED;
  readonly data: SubscriptionWebhookPayload;
  readonly timestamp: Date;

  constructor(payload: SubscriptionWebhookPayload) {
    super();
    // A subscription expires once; retries must keep the receiver's deduplication key.
    this.id = payload.id as UUID;
    this.data = payload;
    this.timestamp = new Date();
  }
}
