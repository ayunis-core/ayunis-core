import { useMemo } from 'react';

import type { ProviderTimeSeriesRowDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { buildProviderChartData } from '../lib/buildProviderChartData';
import { ProviderConsumptionChart } from './ProviderConsumptionChart';
import { ProviderConsumptionLoading } from './ProviderConsumptionLoading';
import { ProviderConsumptionError } from './ProviderConsumptionError';
import { ProviderConsumptionEmpty } from './ProviderConsumptionEmpty';

interface ProviderConsumptionWidgetProps {
  timeSeries: ProviderTimeSeriesRowDto[] | undefined;
  providerDisplayNames: Record<string, string>;
  isLoading: boolean;
  error: unknown;
}

export function ProviderConsumptionWidget({
  timeSeries,
  providerDisplayNames,
  isLoading,
  error,
}: Readonly<ProviderConsumptionWidgetProps>) {
  const { chartData, chartConfig } = useMemo(
    () => buildProviderChartData(timeSeries, providerDisplayNames),
    [timeSeries, providerDisplayNames],
  );

  if (isLoading) return <ProviderConsumptionLoading />;
  if (error) return <ProviderConsumptionError error={error} />;
  if (chartData.length === 0) {
    return <ProviderConsumptionEmpty />;
  }

  return (
    <ProviderConsumptionChart chartData={chartData} chartConfig={chartConfig} />
  );
}
