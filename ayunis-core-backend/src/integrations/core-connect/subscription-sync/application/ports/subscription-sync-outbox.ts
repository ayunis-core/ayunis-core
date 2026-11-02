import type { UUID } from 'crypto';
import type {
  PendingBillingEvent,
  PersistedBillingEvent,
} from 'src/integrations/webhooks/application/events/pending-billing-event';

export interface SubscriptionSyncOutboxEntry {
  id: UUID;
  claimToken: UUID;
  createdAt: Date;
  orgId: UUID;
  pending: PersistedBillingEvent;
}

export abstract class SubscriptionSyncOutbox {
  abstract append(orgId: UUID, events: PendingBillingEvent[]): Promise<void>;
  abstract claim(): Promise<SubscriptionSyncOutboxEntry | null>;
  abstract complete(id: UUID, claimToken: UUID): Promise<void>;
  abstract retry(id: UUID, claimToken: UUID): Promise<void>;
}
