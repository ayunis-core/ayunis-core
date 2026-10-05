import { assertNever } from 'src/common/util/assert-never';
import {
  isSeatBased,
  isUsageBased,
} from 'src/iam/subscriptions/domain/subscription-type-guards';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { getNextDate } from './get-date-for-anchor-and-cycle';

export function getCancellationAccessEnd(
  subscription: Subscription,
  cancelledAt: Date,
): Date {
  if (cancelledAt < subscription.startsAt) {
    return subscription.startsAt;
  }

  if (isSeatBased(subscription)) {
    return getNextDate({
      anchorDate: subscription.renewalCycleAnchor,
      targetDate: cancelledAt,
      cycle: subscription.renewalCycle,
    });
  }

  if (isUsageBased(subscription)) {
    return cancelledAt;
  }

  return assertNever(subscription as never);
}
