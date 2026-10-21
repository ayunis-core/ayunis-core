import type { SubscriptionSyncData } from 'src/iam/subscriptions/application/models/subscription-sync-state';
import { getEffectiveAccessEnd } from 'src/iam/subscriptions/application/util/get-effective-access-end';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { selectCurrentSubscription } from 'src/iam/subscriptions/application/util/find-manageable-subscription';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import {
  isSeatBased,
  isUsageBased,
} from 'src/iam/subscriptions/domain/subscription-type-guards';

export function cloneSubscriptionWithType(
  subscription: Subscription,
): Subscription {
  const copy = structuredClone(subscription);
  Object.setPrototypeOf(copy, Object.getPrototypeOf(subscription) as object);
  return copy;
}

export function subscriptionSyncSignature(subscription: Subscription): string {
  const billing = subscription.billingInfo;
  return JSON.stringify({
    type: subscription.type,
    startsAt: subscription.startsAt,
    cancelledAt: subscription.cancelledAt,
    accessEndsAt: subscription.accessEndsAt,
    seats: isSeatBased(subscription)
      ? {
          count: subscription.noOfSeats,
          price: subscription.pricePerSeat,
          cycle: subscription.renewalCycle,
          anchor: subscription.renewalCycleAnchor,
        }
      : undefined,
    monthlyCredits: isUsageBased(subscription)
      ? subscription.monthlyCredits
      : undefined,
    billing: {
      companyName: billing.companyName,
      street: billing.street,
      houseNumber: billing.houseNumber,
      postalCode: billing.postalCode,
      city: billing.city,
      country: billing.country,
      vatNumber: billing.vatNumber,
      subText: billing.subText,
    },
  });
}

export function hasUnendedAccessPeriod(subscription: Subscription): boolean {
  const end = getEffectiveAccessEnd(subscription);
  return end === null || (end > new Date() && end > subscription.startsAt);
}

export function selectSyncSubscription(
  all: Subscription[],
  data: SubscriptionSyncData,
): Subscription | null {
  const scheduled =
    data.startsAt > new Date()
      ? all.find(
          (entry) =>
            entry.startsAt.getTime() === data.startsAt.getTime() &&
            hasUnendedAccessPeriod(entry),
        )
      : undefined;
  return scheduled ?? all.find(isActive) ?? selectCurrentSubscription(all);
}

export function endSynchronizedAccess(
  subscription: Subscription,
): Subscription {
  const ended = cloneSubscriptionWithType(subscription);
  ended.cancelledAt ??= new Date();
  ended.accessEndsAt = new Date();
  ended.updatedAt = new Date();
  return ended;
}
