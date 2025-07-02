import { UUID } from 'crypto';

export class GetNextBillingDateQuery {
  constructor(public readonly orgId: UUID) {}
}
