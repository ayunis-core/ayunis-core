import type { UUID } from 'crypto';

export interface SubscriptionAccessEndAdjustment {
  subscriptionId: UUID;
  accessEndsAt: Date;
}

export class ResolveSubscriptionOverlapCommand {
  readonly orgId: UUID;
  readonly requestingUserId: UUID;
  readonly authoritativeSubscriptionId: UUID;
  readonly adjustments: SubscriptionAccessEndAdjustment[];
  readonly reason: string;

  constructor(params: {
    orgId: UUID;
    requestingUserId: UUID;
    authoritativeSubscriptionId: UUID;
    adjustments: SubscriptionAccessEndAdjustment[];
    reason: string;
  }) {
    this.orgId = params.orgId;
    this.requestingUserId = params.requestingUserId;
    this.authoritativeSubscriptionId = params.authoritativeSubscriptionId;
    this.adjustments = params.adjustments;
    this.reason = params.reason;
  }
}
