import type { UUID } from 'crypto';
import type { SubscriptionWebhookPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';

export class SubscriptionSeatsUpdatedEvent {
  static readonly EVENT_NAME = 'subscription.seats-updated';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: SubscriptionWebhookPayload,
  ) {}
}
