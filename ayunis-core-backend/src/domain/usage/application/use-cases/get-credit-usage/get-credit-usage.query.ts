import type { UUID } from 'crypto';

export class GetCreditUsageQuery {
  public readonly orgId: UUID;

  constructor(orgId: UUID) {
    this.orgId = orgId;
  }
}
