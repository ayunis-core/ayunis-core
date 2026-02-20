// Utils
import { useMemo } from 'react';

// Features
import { useProviderUsageChart } from '@/pages/admin-settings/usage-settings/api';
import { useProviders } from '@/features/models';

// Widgets
import { ProviderConsumptionWidget } from '@/widgets/provider-consumption-chart';

interface ProviderConsumptionProps {
  startDate?: Date;
  endDate?: Date;
  selectedProvider?: string;
}

export function ProviderConsumption({
  startDate,
  endDate,
  selectedProvider,
}: Readonly<ProviderConsumptionProps>) {
  const {
    data: chartResp,
    isLoading,
    error,
  } = useProviderUsageChart({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    provider: selectedProvider,
  } as Parameters<typeof useProviderUsageChart>[0]);

  const { providers } = useProviders();

  const providerDisplayNames = useMemo(() => {
    const map: Record<string, string> = {};
    providers.forEach((p) => {
      map[p.provider] = p.displayName;
    });
    return map;
  }, [providers]);

  return (
    <ProviderConsumptionWidget
      timeSeries={chartResp?.timeSeries}
      providerDisplayNames={providerDisplayNames}
      isLoading={isLoading}
      error={error}
    />
  );
}
