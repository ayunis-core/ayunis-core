import type { PendingSubscriptionEvent } from 'src/iam/subscriptions/application/events/pending-subscription-event';
import type { PendingAddonEvent } from 'src/iam/addons/application/events/pending-addon-event';

export type PendingBillingEvent = PendingSubscriptionEvent | PendingAddonEvent;

export interface PersistedBillingEvent {
  name: string;
  event: unknown;
}
