import type { UUID } from 'crypto';
import type { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

export interface SubscriptionSyncData {
  type: SubscriptionType;
  startsAt: Date;
  cancelledAt: Date | null;
  accessEndsAt: Date | null;
  monthlyCredits?: number;
  noOfSeats?: number;
  billingInfo: {
    companyName: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
    vatNumber?: string;
  };
}

export interface SubscriptionSyncState {
  orgId: UUID;
  subscription: SubscriptionSyncData | null;
  academyActive: boolean;
}
