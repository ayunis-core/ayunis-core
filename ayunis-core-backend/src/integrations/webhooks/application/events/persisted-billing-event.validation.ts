import { AddonActivatedEvent } from 'src/iam/addons/application/events/addon-activated.event';
import { AddonDeactivatedEvent } from 'src/iam/addons/application/events/addon-deactivated.event';
import { readAddonEvent } from 'src/iam/addons/application/events/addon-event.validation';
import { SubscriptionBillingInfoUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-billing-info-updated.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionMonthlyCreditsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-monthly-credits-updated.event';
import { SubscriptionSeatsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-seats-updated.event';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import {
  readBillingInfoEvent,
  readSubscriptionEvent,
} from 'src/iam/subscriptions/application/events/subscription-event.validation';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type {
  PendingBillingEvent,
  PersistedBillingEvent,
} from './pending-billing-event';

type Reader = (event: unknown) => PendingBillingEvent['event'] | null;

// Keyed by the persisted names, so a renamed class cannot orphan queued rows.
const readers: Record<string, Reader> = {
  [SubscriptionCreatedEvent.EVENT_NAME]: (event) =>
    readSubscriptionEvent(event),
  [SubscriptionCancelledEvent.EVENT_NAME]: (event) =>
    readSubscriptionEvent(event),
  [SubscriptionUncancelledEvent.EVENT_NAME]: (event) =>
    readSubscriptionEvent(event),
  [SubscriptionSeatsUpdatedEvent.EVENT_NAME]: (event) =>
    readSubscriptionEvent(event, SubscriptionType.SEAT_BASED),
  [SubscriptionMonthlyCreditsUpdatedEvent.EVENT_NAME]: (event) =>
    readSubscriptionEvent(event, SubscriptionType.USAGE_BASED),
  [SubscriptionBillingInfoUpdatedEvent.EVENT_NAME]: readBillingInfoEvent,
  [AddonActivatedEvent.EVENT_NAME]: readAddonEvent,
  [AddonDeactivatedEvent.EVENT_NAME]: readAddonEvent,
};

export function readPersistedBillingEvent(
  persisted: PersistedBillingEvent,
): PendingBillingEvent | null {
  const read = Object.hasOwn(readers, persisted.name)
    ? readers[persisted.name]
    : undefined;
  const event = read?.(persisted.event);
  return event
    ? ({ name: persisted.name, event } as PendingBillingEvent)
    : null;
}
