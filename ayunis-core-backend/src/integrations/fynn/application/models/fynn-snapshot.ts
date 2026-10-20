export interface FynnSubscription {
  id: string;
  customer: { id: string };
  status: string;
  activatedAt: string | null;
  cancelledAt: string | null;
  cancellationDate: string | null;
  contractDetails: { contractStart: string | null; contractEnd: string | null };
  items: Array<{
    id: string;
    contractDetails: {
      contractStart: string | null;
      contractEnd: string | null;
    };
    currentMeasurementValue: { quantity: number } | null;
  }>;
}

export interface FynnAddress {
  companyName?: string | null;
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
  countryCode: string;
  vatId?: string | null;
}

export interface FynnCustomer {
  id: string;
  companyName: string;
  customFields: Record<string, unknown> | unknown[];
  defaultAddress: FynnAddress | null;
}

export interface FynnEntitlement {
  feature: { id: string };
  subscriptionItem: { id: string } | null;
  value: string | number | boolean | null;
  status: string;
  validFrom: string | null;
  validUntil: string | null;
}

export interface FynnSnapshot {
  subscription: FynnSubscription;
  customer: FynnCustomer;
  entitlements: FynnEntitlement[];
}

export type FynnSubscriptionSummary = Omit<FynnSubscription, 'items'>;
