import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { RenewalCycle } from './value-objects/renewal-cycle.enum';
import type { SubscriptionBillingInfo } from './subscription-billing-info.entity';

export interface SubscriptionParams {
  id?: UUID;
  createdAt?: Date;
  updatedAt?: Date;
  cancelledAt?: Date | null;
  orgId: UUID;
  noOfSeats: number;
  pricePerSeat: number;
  renewalCycle: RenewalCycle;
  renewalCycleAnchor: Date;
  billingInfo: SubscriptionBillingInfo;
}

export class Subscription {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  orgId: UUID;
  noOfSeats: number;
  pricePerSeat: number;
  renewalCycle: RenewalCycle;
  renewalCycleAnchor: Date;
  billingInfo: SubscriptionBillingInfo;

  constructor(params: SubscriptionParams) {
    this.id = params.id ?? randomUUID();
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
    this.cancelledAt = params.cancelledAt ?? null;
    this.orgId = params.orgId;
    this.noOfSeats = params.noOfSeats;
    this.pricePerSeat = params.pricePerSeat;
    this.renewalCycle = params.renewalCycle;
    this.renewalCycleAnchor = params.renewalCycleAnchor;
    this.billingInfo = params.billingInfo;
  }
}
