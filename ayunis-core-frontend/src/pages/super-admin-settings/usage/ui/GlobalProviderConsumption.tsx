import { useMemo } from 'react';
import { useGlobalProviderUsageChart } from '../api/useGlobalProviderUsageChart';
import { useSuperAdminModelsControllerGetAllCatalogModels } from '@/shared/api';
import { ProviderConsumptionLoading } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart/ProviderConsumptionLoading';
import { ProviderConsumptionError } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart/ProviderConsumptionError';
import { ProviderConsumptionEmpty } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart/ProviderConsumptionEmpty';
import { ProviderConsumptionChart } from '@/pages/admin-settings/usage-settings/ui/provider-consumption-chart/ProviderConsumptionChart';

interface GlobalProviderConsumptionProps {
  startDate?: Date;
  endDate?: Date;
  selectedProvider?: string;
}

export function GlobalProviderConsumption({
  startDate,
  endDate,
  selectedProvider,
}: GlobalProviderConsumptionProps) {
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
