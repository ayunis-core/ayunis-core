import type { UUID } from 'crypto';

export class GetLatestSubscriptionQuery {
  public readonly orgId: UUID;

  constructor(params: { orgId: UUID }) {
    this.orgId = params.orgId;
  }
}
