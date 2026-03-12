import type { Subscription } from '../../domain/subscription.entity';
import {
  isSeatBased,
  isUsageBased,
} from '../../domain/subscription-type-guards';
import { assertNever } from 'src/common/util/assert-never';
import { getNextDate } from './get-date-for-anchor-and-cycle';

export function isActive(subscription: Subscription): boolean {
  if (!subscription.cancelledAt) {
    return true;
  }

  if (isUsageBased(subscription)) {
    return false;
  }

  if (isSeatBased(subscription)) {
    const lastBillingDate = getNextDate({
      anchorDate: subscription.renewalCycleAnchor,
      targetDate: subscription.cancelledAt,
      cycle: subscription.renewalCycle,
    });
    return new Date() <= lastBillingDate;
  }

  return assertNever(subscription as never);
}
