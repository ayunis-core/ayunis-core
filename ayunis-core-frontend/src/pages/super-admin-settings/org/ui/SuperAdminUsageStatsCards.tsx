import { useSuperAdminUsageStats } from '../api/useSuperAdminUsageStats';
import { UsageStatsCardsWidget } from '@/widgets/usage-stats-cards';

interface SuperAdminUsageStatsCardsProps {
  orgId: string;
  startDate?: Date;
  endDate?: Date;
}

export function SuperAdminUsageStatsCards({
  orgId,
  startDate,
  endDate,
}: Readonly<SuperAdminUsageStatsCardsProps>) {
  // When no range is picked, share the cache with the Allgemeines card
  // (which also calls the hook without params) — same query key, one fetch.
  const params =
    startDate || endDate
      ? {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        }
      : undefined;
  const { data: stats, isLoading } = useSuperAdminUsageStats(orgId, params);

  return <UsageStatsCardsWidget stats={stats} isLoading={isLoading} />;
}
