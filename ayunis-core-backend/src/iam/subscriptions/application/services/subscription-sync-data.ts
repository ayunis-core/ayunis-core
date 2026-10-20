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
