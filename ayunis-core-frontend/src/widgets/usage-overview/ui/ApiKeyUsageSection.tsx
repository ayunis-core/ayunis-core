import { ApiKeyUsageTableWidget } from '@/widgets/api-key-usage-table';
import type { UsageOverviewHooks } from '@/widgets/usage-overview/model/types';

interface ApiKeyUsageSectionProps {
  useApiKeyUsage: UsageOverviewHooks['useApiKeyUsage'];
  startDate: string;
  endDate: string;
}

export function ApiKeyUsageSection({
  useApiKeyUsage,
  startDate,
  endDate,
}: Readonly<ApiKeyUsageSectionProps>) {
  const { data, isLoading, error } = useApiKeyUsage({ startDate, endDate });

  return (
    <ApiKeyUsageTableWidget
      apiKeys={data?.data ?? []}
      isLoading={isLoading}
      error={error}
    />
  );
}
