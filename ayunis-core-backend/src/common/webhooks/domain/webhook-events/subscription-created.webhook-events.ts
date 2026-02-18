import { WebhookEvent } from '../webhook-event.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';

export class SubscriptionCreatedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType;
  readonly data: Subscription;
  readonly timestamp: Date;

  constructor(subscription: Subscription) {
    super();
    this.eventType = WebhookEventType.SUBSCRIPTION_CREATED;
    this.data = subscription;
    this.timestamp = new Date(); // Is only created
  }
}
