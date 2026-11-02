import type { PendingSubscriptionEvent } from 'src/iam/subscriptions/application/events/pending-subscription-event';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import {
  isSeatBased,
  isUsageBased,
} from 'src/iam/subscriptions/domain/subscription-type-guards';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import { SubscriptionMonthlyCreditsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-monthly-credits-updated.event';
import { SubscriptionSeatsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-seats-updated.event';
import { SubscriptionBillingInfoUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-billing-info-updated.event';

export function subscriptionSyncEvents(
  previous: Subscription | null,
  next: Subscription,
  created: boolean,
): PendingSubscriptionEvent[] {
  const payload = toSubscriptionEventData(next);
  if (created)
    return [
      {
        name: SubscriptionCreatedEvent.EVENT_NAME,
        event: new SubscriptionCreatedEvent(next.orgId, payload),
      },
    ];
  if (!previous) return [];
  return [
    ...allocationEvents(previous, next),
    ...cancellationEvents(previous, next),
  ];
}

function allocationEvents(
  previous: Subscription,
  next: Subscription,
): PendingSubscriptionEvent[] {
  const events: PendingSubscriptionEvent[] = [];
  if (
    isUsageBased(previous) &&
    isUsageBased(next) &&
    previous.monthlyCredits !== next.monthlyCredits
  ) {
    events.push({
      name: SubscriptionMonthlyCreditsUpdatedEvent.EVENT_NAME,
      event: new SubscriptionMonthlyCreditsUpdatedEvent(
        next.orgId,
        toSubscriptionEventData(next),
      ),
    });
  }
  if (
    isSeatBased(previous) &&
    isSeatBased(next) &&
    previous.noOfSeats !== next.noOfSeats
  ) {
    events.push({
      name: SubscriptionSeatsUpdatedEvent.EVENT_NAME,
      event: new SubscriptionSeatsUpdatedEvent(
        next.orgId,
        toSubscriptionEventData(next),
      ),
    });
  }
  return events;
}

function cancellationEvents(
  previous: Subscription,
  next: Subscription,
): PendingSubscriptionEvent[] {
  const events: PendingSubscriptionEvent[] = [];
  const payload = toSubscriptionEventData(next);
  if (
    next.cancelledAt &&
    (previous.cancelledAt?.getTime() !== next.cancelledAt.getTime() ||
      previous.endsAt?.getTime() !== next.endsAt?.getTime())
  ) {
    events.push({
      name: SubscriptionCancelledEvent.EVENT_NAME,
      event: new SubscriptionCancelledEvent(next.orgId, payload),
    });
  } else if (previous.cancelledAt && !next.cancelledAt) {
    events.push({
      name: SubscriptionUncancelledEvent.EVENT_NAME,
      event: new SubscriptionUncancelledEvent(next.orgId, payload),
    });
  }
  return events;
}

export function subscriptionBillingSyncEvent(
  next: Subscription,
): PendingSubscriptionEvent {
  const {
    companyName,
    street,
    houseNumber,
    postalCode,
    city,
    country,
    vatNumber,
    subText,
  } = next.billingInfo;
  return {
    name: SubscriptionBillingInfoUpdatedEvent.EVENT_NAME,
    event: new SubscriptionBillingInfoUpdatedEvent(next.orgId, {
      orgId: next.orgId,
      subscriptionId: next.id,
      companyName,
      street,
      houseNumber,
      postalCode,
      city,
      country,
      vatNumber,
      subText,
    }),
  };
}
