import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { getCancellationAccessEnd } from './get-cancellation-access-end';

export function getEffectiveAccessEnd(subscription: Subscription): Date | null {
  if (subscription.accessEndsAt) {
    return subscription.accessEndsAt;
  }
  if (subscription.cancelledAt) {
    return getCancellationAccessEnd(subscription, subscription.cancelledAt);
  }
  return null;
}
