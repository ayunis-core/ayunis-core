import type { UUID } from 'crypto';

export abstract class ExternalSubscriptionRevision {
  abstract observe(orgId: UUID): Promise<UUID>;
  abstract begin(orgId: UUID): Promise<UUID>;
  abstract isCurrent(orgId: UUID, revision: UUID): Promise<boolean>;
}
