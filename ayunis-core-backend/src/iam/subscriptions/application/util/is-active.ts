import type { Subscription } from '../../domain/subscription.entity';
import { getNextDate } from './get-date-for-anchor-and-cycle';

export function isActive(subscription: Subscription): boolean {
  if (subscription.cancelledAt) {
    const lastBillingDate = getNextDate({
      anchorDate: subscription.renewalCycleAnchor,
      targetDate: subscription.cancelledAt,
      cycle: subscription.renewalCycle,
    });

    // If we're past the last billing date, subscription is no longer active
    return new Date() <= lastBillingDate;
  }

  return true;
}
