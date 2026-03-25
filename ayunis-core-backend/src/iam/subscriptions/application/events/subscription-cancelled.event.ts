import type { UUID } from 'crypto';
import type { SubscriptionWebhookPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';

export class SubscriptionCancelledEvent {
  static readonly EVENT_NAME = 'subscription.cancelled';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: SubscriptionWebhookPayload,
  ) {}
}
