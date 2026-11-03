import type { UsageBasedWebhookPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class SubscriptionMonthlyCreditsUpdatedWebhookEvent extends WebhookEvent<
  typeof WebhookEventType.SUBSCRIPTION_MONTHLY_CREDITS_UPDATED
> {
  readonly eventType = WebhookEventType.SUBSCRIPTION_MONTHLY_CREDITS_UPDATED;
  readonly timestamp = new Date();

  constructor(readonly data: UsageBasedWebhookPayload) {
    super();
  }
}
