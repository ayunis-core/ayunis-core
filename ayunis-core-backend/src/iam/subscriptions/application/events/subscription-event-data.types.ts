import type { UUID } from 'crypto';
import type { RenewalCycle } from '../../domain/value-objects/renewal-cycle.enum';
import type { SubscriptionType } from '../../domain/value-objects/subscription-type.enum';

export interface SubscriptionEventDataBase {
  id: UUID;
  orgId: UUID;
  type: SubscriptionType;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeatBasedSubscriptionEventData extends SubscriptionEventDataBase {
  type: SubscriptionType.SEAT_BASED;
  noOfSeats: number;
  pricePerSeat: number;
  renewalCycle: RenewalCycle;
  renewalCycleAnchor: Date;
}

export interface UsageBasedSubscriptionEventData extends SubscriptionEventDataBase {
  type: SubscriptionType.USAGE_BASED;
  monthlyCredits: number;
}

export type SubscriptionEventData =
  | SeatBasedSubscriptionEventData
  | UsageBasedSubscriptionEventData;

export interface BillingInfoEventData {
  companyName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string;
  subText?: string;
  orgId: UUID;
  subscriptionId: UUID;
}
