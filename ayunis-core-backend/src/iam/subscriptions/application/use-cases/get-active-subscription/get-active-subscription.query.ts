import type { UUID } from 'crypto';

export class GetActiveSubscriptionQuery {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;

  constructor(params: { orgId: UUID; requestingUserId: UUID }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
  }
}
