import { UUID } from 'crypto';

export class HasActiveSubscriptionQuery {
  constructor(public readonly orgId: UUID) {}
}
