import type { OrgSubscriptionHistoryItemDto } from '@/shared/api';
import type {
  SubscriptionHistoryItem,
  SubscriptionHistoryStatus,
} from '@/pages/super-admin-settings/org/model/types';

type BadgeVariant =
  'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';

const STATUS_BADGE_VARIANT: Record<SubscriptionHistoryStatus, BadgeVariant> = {
  ACTIVE: 'secondary',
  SCHEDULED: 'outline',
  CANCELLED: 'destructive',
  HISTORICAL: 'ghost',
};

const HISTORY_STATUSES = Object.keys(
  STATUS_BADGE_VARIANT,
) as SubscriptionHistoryStatus[];

export function shouldShowSubscriptionHistory(count: number): boolean {
  return count > 1;
}

export function subscriptionHistoryBadgeVariant(
  status: SubscriptionHistoryStatus,
): BadgeVariant {
  return STATUS_BADGE_VARIANT[status];
}

export function toSubscriptionHistoryItem(
  item: OrgSubscriptionHistoryItemDto,
): SubscriptionHistoryItem {
  return {
    id: item.id,
    type: item.type,
    status: toHistoryStatus(item.status),
    isLatest: item.isLatest,
    createdAt: item.createdAt,
    startsAt: item.startsAt,
    cancelledAt: cancelledAtIso(item.cancelledAt),
    noOfSeats: item.noOfSeats,
    monthlyCredits: item.monthlyCredits,
  };
}

function toHistoryStatus(status: string): SubscriptionHistoryStatus {
  return (
    HISTORY_STATUSES.find((candidate) => candidate === status) ?? 'HISTORICAL'
  );
}

function cancelledAtIso(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
