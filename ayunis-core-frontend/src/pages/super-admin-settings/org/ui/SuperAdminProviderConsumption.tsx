import { useMemo } from 'react';
import { useSuperAdminProviderUsageChart } from '../api/useSuperAdminProviderUsageChart';
import { useSuperAdminModelsControllerGetPermittedModels } from '@/shared/api';
import { ProviderConsumptionWidget } from '@/widgets/provider-consumption-chart';

interface SuperAdminProviderConsumptionProps {
  orgId: string;
  startDate?: Date;
  endDate?: Date;
  selectedProvider?: string;
}

export function SuperAdminProviderConsumption({
  orgId,
  startDate,
  endDate,
  selectedProvider,
}: Readonly<SuperAdminProviderConsumptionProps>) {
  const {
    data: chartResp,
    isLoading,
    error,
  } = useSuperAdminProviderUsageChart(orgId, {
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    provider: selectedProvider,
  });

  const { data: permittedModels } =
    useSuperAdminModelsControllerGetPermittedModels(orgId);

  const providerDisplayNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (permittedModels) {
      permittedModels.forEach((m) => {
        if (!map[m.provider]) {
          map[m.provider] = m.providerDisplayName;
        }
      });
    }
    return map;
  }, [permittedModels]);

  return (
    <ProviderConsumptionWidget
      timeSeries={chartResp?.timeSeries}
      providerDisplayNames={providerDisplayNames}
      isLoading={isLoading}
      error={error}
    />
  );
}
