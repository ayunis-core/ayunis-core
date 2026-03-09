import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { SubscriptionType } from './value-objects/subscription-type.enum';
import type { SubscriptionBillingInfo } from './subscription-billing-info.entity';

export interface SubscriptionParams {
  id?: UUID;
  createdAt?: Date;
  updatedAt?: Date;
  cancelledAt?: Date | null;
  orgId: UUID;
  billingInfo: SubscriptionBillingInfo;
}

export abstract class Subscription {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  orgId: UUID;
  billingInfo: SubscriptionBillingInfo;
  abstract readonly type: SubscriptionType;

  protected constructor(params: SubscriptionParams) {
    this.id = params.id ?? randomUUID();
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
    this.cancelledAt = params.cancelledAt ?? null;
    this.orgId = params.orgId;
    this.billingInfo = params.billingInfo;
  }
}
