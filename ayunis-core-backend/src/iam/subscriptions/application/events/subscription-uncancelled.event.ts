import type { UUID } from 'crypto';
import type { SubscriptionWebhookPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';

export class SubscriptionUncancelledEvent {
  static readonly EVENT_NAME = 'subscription.uncancelled';

  constructor(
    public readonly orgId: UUID,
    public readonly payload: SubscriptionWebhookPayload,
  ) {}
}
