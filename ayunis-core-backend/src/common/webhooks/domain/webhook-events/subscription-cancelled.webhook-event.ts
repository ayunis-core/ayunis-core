import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { WebhookEvent } from '../webhook-event.entity';

export class SubscriptionCancelledWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType;
  readonly data: Subscription;
  readonly timestamp: Date;

  constructor(subscription: Subscription) {
    super();
    this.eventType = WebhookEventType.SUBSCRIPTION_CANCELLED;
    this.data = subscription;
    this.timestamp = new Date(); // Is only created
  }
}
