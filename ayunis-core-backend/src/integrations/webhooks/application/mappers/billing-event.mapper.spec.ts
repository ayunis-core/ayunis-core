import { randomUUID } from 'crypto';
import type { PendingBillingEvent } from 'src/integrations/webhooks/application/events/pending-billing-event';
import { AddonActivatedEvent } from 'src/iam/addons/application/events/addon-activated.event';
import { AddonDeactivatedEvent } from 'src/iam/addons/application/events/addon-deactivated.event';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import { SubscriptionSeatsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-seats-updated.event';
import { SubscriptionMonthlyCreditsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-monthly-credits-updated.event';
import { SubscriptionBillingInfoUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-billing-info-updated.event';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { mapBillingEvent } from './billing-event.mapper';

type AssertFalse<T extends false> = T;
export type RejectUnknownEvent = AssertFalse<
  {
    name: 'unsupported';
    event: AddonActivatedEvent;
  } extends PendingBillingEvent
    ? true
    : false
>;
export type RejectMismatchedPayload = AssertFalse<
  {
    name: typeof SubscriptionCreatedEvent.EVENT_NAME;
    event: AddonActivatedEvent;
  } extends PendingBillingEvent
    ? true
    : false
>;
export type RejectWrongAllowance = AssertFalse<
  {
    name: typeof SubscriptionSeatsUpdatedEvent.EVENT_NAME;
    event: SubscriptionMonthlyCreditsUpdatedEvent;
  } extends PendingBillingEvent
    ? true
    : false
>;

const orgId = randomUUID();
const at = new Date('2026-10-20T00:00:00Z');
const usage = {
  id: randomUUID(),
  orgId,
  type: SubscriptionType.USAGE_BASED as const,
  monthlyCredits: 45_000_000,
  startsAt: at,
  createdAt: at,
  updatedAt: at,
  endsAt: null,
  cancelledAt: null,
};
const seats = {
  ...usage,
  type: SubscriptionType.SEAT_BASED as const,
  noOfSeats: 25,
  pricePerSeat: 18,
  renewalCycle: RenewalCycle.YEARLY,
  renewalCycleAnchor: at,
};
const billing = {
  orgId,
  subscriptionId: usage.id,
  companyName: 'Example Municipality',
  street: 'Town Hall Street',
  houseNumber: '1',
  postalCode: '10115',
  city: 'Berlin',
  country: 'DE',
};
const cases: { pending: PendingBillingEvent; expected: WebhookEventType }[] = [
  {
    pending: {
      name: SubscriptionCreatedEvent.EVENT_NAME,
      event: new SubscriptionCreatedEvent(orgId, usage),
    },
    expected: WebhookEventType.SUBSCRIPTION_CREATED,
  },
  {
    pending: {
      name: SubscriptionCancelledEvent.EVENT_NAME,
      event: new SubscriptionCancelledEvent(orgId, usage),
    },
    expected: WebhookEventType.SUBSCRIPTION_CANCELLED,
  },
  {
    pending: {
      name: SubscriptionUncancelledEvent.EVENT_NAME,
      event: new SubscriptionUncancelledEvent(orgId, usage),
    },
    expected: WebhookEventType.SUBSCRIPTION_UNCANCELLED,
  },
  {
    pending: {
      name: SubscriptionSeatsUpdatedEvent.EVENT_NAME,
      event: new SubscriptionSeatsUpdatedEvent(orgId, seats),
    },
    expected: WebhookEventType.SUBSCRIPTION_SEATS_UPDATED,
  },
  {
    pending: {
      name: SubscriptionMonthlyCreditsUpdatedEvent.EVENT_NAME,
      event: new SubscriptionMonthlyCreditsUpdatedEvent(orgId, usage),
    },
    expected: WebhookEventType.SUBSCRIPTION_MONTHLY_CREDITS_UPDATED,
  },
  {
    pending: {
      name: SubscriptionBillingInfoUpdatedEvent.EVENT_NAME,
      event: new SubscriptionBillingInfoUpdatedEvent(orgId, billing),
    },
    expected: WebhookEventType.SUBSCRIPTION_BILLING_INFO_UPDATED,
  },
  {
    pending: {
      name: AddonActivatedEvent.EVENT_NAME,
      event: new AddonActivatedEvent(
        orgId,
        AddonType.AYUNIS_CORE_ACADEMY,
        null,
      ),
    },
    expected: WebhookEventType.ADDON_ACTIVATED,
  },
  {
    pending: {
      name: AddonDeactivatedEvent.EVENT_NAME,
      event: new AddonDeactivatedEvent(
        orgId,
        AddonType.AYUNIS_CORE_ACADEMY,
        null,
      ),
    },
    expected: WebhookEventType.ADDON_DEACTIVATED,
  },
];
it.each(cases)(
  'maps $pending.name to $expected with its typed payload',
  ({ pending, expected }) => {
    expect(mapBillingEvent(pending)).toMatchObject({
      eventType: expected,
      data: { orgId },
    });
  },
);
