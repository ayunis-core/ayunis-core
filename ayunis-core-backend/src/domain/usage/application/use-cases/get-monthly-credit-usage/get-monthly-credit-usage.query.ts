import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageQuery {
  public readonly orgId: UUID;

  constructor(orgId: UUID) {
    this.orgId = orgId;
  }
}
