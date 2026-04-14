import type { UUID } from 'crypto';

export class GetMonthlyCreditUsageQuery {
  public readonly orgId: UUID;
  public readonly since?: Date;

  constructor(orgId: UUID, since?: Date) {
    this.orgId = orgId;
    this.since = since;
  }
}
