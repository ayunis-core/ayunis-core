import type { UUID } from 'crypto';

export interface SubscriptionEventDataBase {
  id: UUID;
  orgId: UUID;
  type: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeatBasedSubscriptionEventData extends SubscriptionEventDataBase {
  type: 'SEAT_BASED';
  noOfSeats: number;
  pricePerSeat: number;
  renewalCycle: string;
  renewalCycleAnchor: string;
}

export interface UsageBasedSubscriptionEventData extends SubscriptionEventDataBase {
  type: 'USAGE_BASED';
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
  orgId: string;
  subscriptionId: string;
}
