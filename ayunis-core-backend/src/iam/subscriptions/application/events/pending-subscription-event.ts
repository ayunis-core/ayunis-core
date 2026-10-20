import type { SubscriptionCreatedEvent } from './subscription-created.event';
import type { SubscriptionCancelledEvent } from './subscription-cancelled.event';
import type { SubscriptionUncancelledEvent } from './subscription-uncancelled.event';
import type { SubscriptionSeatsUpdatedEvent } from './subscription-seats-updated.event';
import type { SubscriptionMonthlyCreditsUpdatedEvent } from './subscription-monthly-credits-updated.event';
import type { SubscriptionBillingInfoUpdatedEvent } from './subscription-billing-info-updated.event';

// Names are persisted: changing a producer must preserve readers for queued events.
export type PendingSubscriptionEvent =
  | {
      name: typeof SubscriptionCreatedEvent.EVENT_NAME;
      event: SubscriptionCreatedEvent;
    }
  | {
      name: typeof SubscriptionCancelledEvent.EVENT_NAME;
      event: SubscriptionCancelledEvent;
    }
  | {
      name: typeof SubscriptionUncancelledEvent.EVENT_NAME;
      event: SubscriptionUncancelledEvent;
    }
  | {
      name: typeof SubscriptionSeatsUpdatedEvent.EVENT_NAME;
      event: SubscriptionSeatsUpdatedEvent;
    }
  | {
      name: typeof SubscriptionMonthlyCreditsUpdatedEvent.EVENT_NAME;
      event: SubscriptionMonthlyCreditsUpdatedEvent;
    }
  | {
      name: typeof SubscriptionBillingInfoUpdatedEvent.EVENT_NAME;
      event: SubscriptionBillingInfoUpdatedEvent;
    };
