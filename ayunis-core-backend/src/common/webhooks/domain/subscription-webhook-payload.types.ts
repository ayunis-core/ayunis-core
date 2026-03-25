import type { UUID } from 'crypto';

export interface SubscriptionWebhookPayloadBase {
  id: UUID;
  orgId: UUID;
  type: string;
  cancelledAt: string | null;
  startsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeatBasedWebhookPayload extends SubscriptionWebhookPayloadBase {
  type: 'SEAT_BASED';
  noOfSeats: number;
  pricePerSeat: number;
  renewalCycle: string;
  renewalCycleAnchor: string;
}

export interface UsageBasedWebhookPayload extends SubscriptionWebhookPayloadBase {
  type: 'USAGE_BASED';
  monthlyCredits: number;
}

export type SubscriptionWebhookPayload =
  | SeatBasedWebhookPayload
  | UsageBasedWebhookPayload;

export interface BillingInfoPayload {
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
