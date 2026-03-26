import type { UUID } from 'crypto';

export class GetActiveSubscriptionQuery {
  public readonly orgId: UUID;
  public readonly requestingUserId: UUID;
  public readonly includeScheduled: boolean;

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
    includeScheduled?: boolean;
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.includeScheduled = params.includeScheduled ?? false;
  }
}
