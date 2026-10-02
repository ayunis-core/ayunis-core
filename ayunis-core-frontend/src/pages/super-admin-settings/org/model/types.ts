export interface UpdateSubscriptionStartDateFormData {
  startsAt: string;
}

export const SubscriptionHistoryStatus = {
  ACTIVE: 'ACTIVE',
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  HISTORICAL: 'HISTORICAL',
} as const;

export type SubscriptionHistoryStatus =
  (typeof SubscriptionHistoryStatus)[keyof typeof SubscriptionHistoryStatus];

export interface SubscriptionHistoryItem {
  id: string;
  type: string;
  status: SubscriptionHistoryStatus;
  isLatest: boolean;
  createdAt: string;
  startsAt: string;
  cancelledAt?: string | null;
  accessEndsAt: string | null;
  noOfSeats?: number;
  monthlyCredits?: number;
}

export interface ResolveSubscriptionOverlapFormData {
  authoritativeSubscriptionId: string;
  accessEndsAtBySubscriptionId: Record<string, string>;
  reason: string;
}

export interface UpdateOrgNameFormData {
  name: string;
}

export interface SsoConnectionFormFields {
  emailDomains: Array<{ value: string }>;
  zitadelOrgId: string;
  zitadelIdpId: string;
  domainVerified: boolean;
}
