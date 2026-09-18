import type { UUID } from 'crypto';

export class ListOrgSubscriptionsQuery {
  public readonly orgId: UUID;

  constructor(orgId: UUID) {
    this.orgId = orgId;
  }
}
