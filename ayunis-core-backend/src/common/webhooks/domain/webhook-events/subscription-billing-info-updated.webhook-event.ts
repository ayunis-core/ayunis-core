import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { WebhookEventType } from '../value-objects/webhook-event-type.enum';
import { WebhookEvent } from '../webhook-event.entity';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';

export class SubscriptionBillingInfoUpdatedWebhookEvent extends WebhookEvent {
  readonly eventType: WebhookEventType;
  readonly data: SubscriptionBillingInfo & {
    orgId: string;
    subscriptionId: string;
  };
  readonly timestamp: Date;

  constructor(subscription: Subscription) {
    super();
    this.eventType = WebhookEventType.SUBSCRIPTION_BILLING_INFO_UPDATED;
    this.data = {
      ...subscription.billingInfo,
      orgId: subscription.orgId,
      subscriptionId: subscription.id,
    };
    this.timestamp = new Date();
  }
}
