import type { UUID } from 'crypto';
import type { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

export class HasActiveSubscriptionQuery {
  constructor(
    public readonly orgId: UUID,
    /**
     * When set, the use case only considers subscriptions of this type as
     * satisfying the "active" predicate. Use this to gate a route on a
     * specific commercial path (e.g. usage-based for API-key access).
     */
    public readonly type?: SubscriptionType,
  ) {}
}
