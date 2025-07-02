import { randomUUID, UUID } from 'crypto';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { BillingCycle } from './value-objects/billing-cycle.enum';

export interface SubscriptionParams {
  id?: UUID;
  createdAt?: Date;
  updatedAt?: Date;
  cancelledAt?: Date | null;
  org: Org;
  pricePerSeat: number;
  billingCycle: BillingCycle;
  billingCycleAnchor: Date;
}

export class Subscription {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  org: Org;
  pricePerSeat: number;
  billingCycle: BillingCycle;
  billingCycleAnchor: Date;

  constructor(params: SubscriptionParams) {
    this.id = params.id ?? randomUUID();
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
    this.cancelledAt = params.cancelledAt ?? null;
    this.org = params.org;
    this.pricePerSeat = params.pricePerSeat;
    this.billingCycle = params.billingCycle;
    this.billingCycleAnchor = params.billingCycleAnchor;
  }
}
