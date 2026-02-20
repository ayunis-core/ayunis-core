import { useUsageStats } from '@/pages/admin-settings/usage-settings/api';
import { UsageStatsCardsWidget } from '@/widgets/usage-stats-cards';

interface UsageStatsCardsProps {
  startDate?: Date;
  endDate?: Date;
}

export function UsageStatsCards({
  startDate,
  endDate,
}: Readonly<UsageStatsCardsProps>) {
  const { data: stats, isLoading } = useUsageStats({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  return <UsageStatsCardsWidget stats={stats} isLoading={isLoading} />;
}
