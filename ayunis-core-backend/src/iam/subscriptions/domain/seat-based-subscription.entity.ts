import type { RenewalCycle } from './value-objects/renewal-cycle.enum';
import { SubscriptionType } from './value-objects/subscription-type.enum';
import { Subscription, type SubscriptionParams } from './subscription.entity';

export interface SeatBasedSubscriptionParams extends SubscriptionParams {
  noOfSeats: number;
  pricePerSeat: number;
  renewalCycle: RenewalCycle;
  renewalCycleAnchor: Date;
}

export class SeatBasedSubscription extends Subscription {
  readonly type = SubscriptionType.SEAT_BASED;
  noOfSeats: number;
  pricePerSeat: number;
  renewalCycle: RenewalCycle;
  renewalCycleAnchor: Date;

  constructor(params: SeatBasedSubscriptionParams) {
    super(params);
    this.noOfSeats = params.noOfSeats;
    this.pricePerSeat = params.pricePerSeat;
    this.renewalCycle = params.renewalCycle;
    this.renewalCycleAnchor = params.renewalCycleAnchor;
  }
}
