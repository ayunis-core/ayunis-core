import { UUID } from 'crypto';

export class GetSubscriptionStatusQuery {
  constructor(public readonly orgId: UUID) {}
}
