import type { UUID } from 'crypto';

export class IsUsageBasedSubscriptionQuery {
  constructor(public readonly orgId: UUID) {}
}
