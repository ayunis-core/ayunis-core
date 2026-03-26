import type { Subscription } from '../../domain/subscription.entity';
import { isSeatBased } from '../../domain/subscription-type-guards';
import { getNextDate } from './get-date-for-anchor-and-cycle';

export function getNextRenewalDate(subscription: Subscription): Date {
  const now = new Date();

  if (now < subscription.startsAt) {
    return subscription.startsAt;
  }

  if (isSeatBased(subscription)) {
    if (subscription.cancelledAt) {
      return getNextDate({
        anchorDate: subscription.renewalCycleAnchor,
        targetDate: subscription.cancelledAt,
        cycle: subscription.renewalCycle,
      });
    }
    return getNextDate({
      anchorDate: subscription.renewalCycleAnchor,
      targetDate: now,
      cycle: subscription.renewalCycle,
    });
  }

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
