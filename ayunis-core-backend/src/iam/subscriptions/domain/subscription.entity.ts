import { randomUUID, UUID } from 'crypto';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { RenewalCycle } from './value-objects/renewal-cycle.enum';

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
  }
}
