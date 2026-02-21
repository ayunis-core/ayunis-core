import { useMemo } from 'react';
import { useGlobalProviderUsageChart } from '../api/useGlobalProviderUsageChart';
import { useSuperAdminModelsControllerGetAllCatalogModels } from '@/shared/api';
import { ProviderConsumptionWidget } from '@/widgets/provider-consumption-chart';

interface GlobalProviderConsumptionProps {
  startDate?: Date;
  endDate?: Date;
  selectedProvider?: string;
}

export function GlobalProviderConsumption({
  startDate,
  endDate,
  selectedProvider,
}: Readonly<GlobalProviderConsumptionProps>) {
  const {
    data: chartResp,
    isLoading,
    error,
  } = useGlobalProviderUsageChart({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    provider: selectedProvider,
  });

  const { data: catalogModels } =
    useSuperAdminModelsControllerGetAllCatalogModels();

  const providerDisplayNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (catalogModels) {
      catalogModels.forEach((m) => {
        if (!map[m.provider]) {
          map[m.provider] =
            m.provider.charAt(0).toUpperCase() + m.provider.slice(1);
        }
      });
    }
    return map;
  }, [catalogModels]);

  return (
    <ProviderConsumptionWidget
      timeSeries={chartResp?.timeSeries}
      providerDisplayNames={providerDisplayNames}
      isLoading={isLoading}
      error={error}
    />
  );
}
