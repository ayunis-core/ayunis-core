import type { SubscriptionHistoryStatus } from '@/pages/super-admin-settings/org/model/types';

type BadgeVariant =
  'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';

const STATUS_BADGE_VARIANT: Record<SubscriptionHistoryStatus, BadgeVariant> = {
  ACTIVE: 'secondary',
  SCHEDULED: 'outline',
  CANCELLED: 'destructive',
  HISTORICAL: 'ghost',
};

export function shouldShowSubscriptionHistory(count: number): boolean {
  return count > 1;
}

export function subscriptionHistoryBadgeVariant(
  status: SubscriptionHistoryStatus,
): BadgeVariant {
  return STATUS_BADGE_VARIANT[status];
}
