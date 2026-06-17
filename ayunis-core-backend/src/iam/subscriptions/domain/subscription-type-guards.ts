import type { Subscription } from './subscription.entity';
import { SeatBasedSubscription } from './seat-based-subscription.entity';
import { UsageBasedSubscription } from './usage-based-subscription.entity';

export function isSeatBased(
  subscription: Subscription,
): subscription is SeatBasedSubscription {
  return subscription instanceof SeatBasedSubscription;
}

export function isUsageBased(
  subscription: Subscription,
): subscription is UsageBasedSubscription {
  return subscription instanceof UsageBasedSubscription;
}
