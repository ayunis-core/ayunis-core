import type { UUID } from 'crypto';
import type { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

interface SubscriptionSyncBase {
  startsAt: Date;
  cancelledAt: Date | null;
  accessEndsAt: Date | null;
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

export type SubscriptionSyncData = SubscriptionSyncBase &
  (
    | {
        type: SubscriptionType.SEAT_BASED;
        noOfSeats: number;
        monthlyCredits?: never;
      }
    | {
        type: SubscriptionType.USAGE_BASED;
        monthlyCredits: number;
        noOfSeats?: never;
      }
  );

export interface SubscriptionSyncState {
  orgId: UUID;
  subscription: SubscriptionSyncData | null;
  academyActive: boolean;
}
