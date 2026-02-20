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
  const { data: stats, isLoading } = useSuperAdminUsageStats(orgId, {
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  return <UsageStatsCardsWidget stats={stats} isLoading={isLoading} />;
}
