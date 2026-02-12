import { useMemo } from 'react';
import { useSuperAdminProviderUsageChart } from '../api/useSuperAdminProviderUsageChart';
import { useSuperAdminModelsControllerGetPermittedModels } from '@/shared/api';
import { ProviderConsumptionLoading } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart/ProviderConsumptionLoading';
import { ProviderConsumptionError } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart/ProviderConsumptionError';
import { ProviderConsumptionEmpty } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart/ProviderConsumptionEmpty';
import { ProviderConsumptionChart } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart/ProviderConsumptionChart';

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
}: SuperAdminProviderConsumptionProps) {
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

  const { chartData, chartConfig } = useMemo(() => {
    const empty = {
      chartData: [] as Array<Record<string, string | number>>,
      chartConfig: {} as Record<string, { label: string; color: string }>,
    };
    const rows = chartResp?.timeSeries ?? [];
    if (rows.length === 0) return empty;

    const seriesKeys = Object.keys(rows[0].values ?? {});
    const chartData = rows.map((r) => ({ date: r.date, ...r.values }));

    const palette = [
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-3)',
      'var(--chart-4)',
      'var(--chart-5)',
    ];
    const chartConfig: Record<string, { label: string; color: string }> = {};
    seriesKeys.forEach((key, idx) => {
      chartConfig[key] = {
        label: providerDisplayNames[key] || key,
        color: palette[idx % palette.length],
      };
    });

    return { chartData, chartConfig };
  }, [chartResp?.timeSeries, providerDisplayNames]);

  if (isLoading) return <ProviderConsumptionLoading />;
  if (error) return <ProviderConsumptionError error={error} />;
  if (!chartData || chartData.length === 0) return <ProviderConsumptionEmpty />;

  return (
    <ProviderConsumptionChart chartData={chartData} chartConfig={chartConfig} />
  );
}
