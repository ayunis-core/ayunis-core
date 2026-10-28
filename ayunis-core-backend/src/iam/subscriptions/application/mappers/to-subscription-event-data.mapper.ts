import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import type { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import type { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import {
  isSeatBased,
  isUsageBased,
} from 'src/iam/subscriptions/domain/subscription-type-guards';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { assertNever } from 'src/common/util/assert-never';
import type {
  SeatBasedSubscriptionEventData,
  UsageBasedSubscriptionEventData,
  SubscriptionEventData,
  SubscriptionEventDataBase,
} from 'src/iam/subscriptions/application/events/subscription-event-data.types';

/**
 * Maps a {@link Subscription} entity to {@link SubscriptionEventData}
 * for use in domain events. Unlike the webhook payload mapper, this
 * preserves `Date` objects instead of converting to ISO strings.
 */
export function toSubscriptionEventData(
  subscription: SeatBasedSubscription,
): SeatBasedSubscriptionEventData;
export function toSubscriptionEventData(
  subscription: UsageBasedSubscription,
): UsageBasedSubscriptionEventData;
export function toSubscriptionEventData(
  subscription: Subscription,
): SubscriptionEventData;
export function toSubscriptionEventData(
  subscription: Subscription,
): SubscriptionEventData {
  const base: SubscriptionEventDataBase = {
    id: subscription.id,
    orgId: subscription.orgId,
    type: subscription.type,
    cancelledAt: subscription.cancelledAt,
    endsAt: subscription.endsAt,
    startsAt: subscription.startsAt,
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
