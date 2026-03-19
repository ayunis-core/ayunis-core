import type { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

export interface HasActiveSubscriptionResult {
  hasActiveSubscription: boolean;
  subscriptionType: SubscriptionType | null;
}
