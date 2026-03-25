import type { Subscription } from '../../domain/subscription.entity';
import {
  isSeatBased,
  isUsageBased,
} from '../../domain/subscription-type-guards';
import { SubscriptionType } from '../../domain/value-objects/subscription-type.enum';
import { assertNever } from 'src/common/util/assert-never';
import type {
  SubscriptionEventData,
  SubscriptionEventDataBase,
} from '../events/subscription-event-data.types';

/**
 * Maps a {@link Subscription} entity to {@link SubscriptionEventData}
 * for use in domain events. Unlike the webhook payload mapper, this
 * preserves `Date` objects instead of converting to ISO strings.
 */
export function toSubscriptionEventData(
  subscription: Subscription,
): SubscriptionEventData {
  const base: SubscriptionEventDataBase = {
    id: subscription.id,
    orgId: subscription.orgId,
    type: subscription.type,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };

  if (isSeatBased(subscription)) {
    return {
      ...base,
      type: SubscriptionType.SEAT_BASED,
      noOfSeats: subscription.noOfSeats,
      pricePerSeat: subscription.pricePerSeat,
      renewalCycle: subscription.renewalCycle,
      renewalCycleAnchor: subscription.renewalCycleAnchor,
    };
  }

  if (isUsageBased(subscription)) {
    return {
      ...base,
      type: SubscriptionType.USAGE_BASED,
      monthlyCredits: subscription.monthlyCredits,
    };
  }

  return assertNever(subscription as never);
}
