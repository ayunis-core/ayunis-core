import type { UUID } from 'crypto';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';

export interface ExternalSubscriptionOutboxEntry {
  id: UUID;
  claimToken: UUID;
  createdAt: Date;
  orgId: UUID;
  pending: PendingDomainEvent;
}

export abstract class ExternalSubscriptionOutbox {
  abstract append(orgId: UUID, events: PendingDomainEvent[]): Promise<void>;
  abstract claim(): Promise<ExternalSubscriptionOutboxEntry | null>;
  abstract complete(id: UUID, claimToken: UUID): Promise<void>;
  abstract retry(id: UUID, claimToken: UUID): Promise<void>;
}
