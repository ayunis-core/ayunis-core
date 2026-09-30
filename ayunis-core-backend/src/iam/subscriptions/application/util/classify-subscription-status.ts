import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionLifecycleStatus } from 'src/iam/subscriptions/domain/value-objects/subscription-lifecycle-status.enum';
import { isActive } from './is-active';

export function classifySubscriptionStatus(
  subscription: Subscription,
): SubscriptionLifecycleStatus {
  if (subscription.cancelledAt) {
    return isActive(subscription)
      ? SubscriptionLifecycleStatus.CANCELLED
      : SubscriptionLifecycleStatus.HISTORICAL;
  }

  if (new Date() < subscription.startsAt) {
    return SubscriptionLifecycleStatus.SCHEDULED;
  }

  return SubscriptionLifecycleStatus.ACTIVE;
}
