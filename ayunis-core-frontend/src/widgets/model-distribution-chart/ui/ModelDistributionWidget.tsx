import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { buildModelDistributionChartData } from '../lib/buildModelDistributionChartData';
import { ModelDistributionChart } from './ModelDistributionChart';
import { ModelDistributionLoading } from './ModelDistributionLoading';
import { ModelDistributionError } from './ModelDistributionError';
import { ModelDistributionEmpty } from './ModelDistributionEmpty';

interface ModelEntry {
  modelId: string;
  modelName: string;
  displayName: string;
  provider: string;
  tokens: number;
  requests: number;
  percentage: number;
}

interface ModelDistributionWidgetProps {
  models: ModelEntry[] | undefined;
  isLoading: boolean;
  error: unknown;
}

export function ModelDistributionWidget({
  models,
  isLoading,
  error,
}: Readonly<ModelDistributionWidgetProps>) {
  const { t } = useTranslation('admin-settings-usage');

  const { chartData, chartConfig, modelBreakdown } = useMemo(
    () => buildModelDistributionChartData(models, t),
    [models, t],
  );

  if (isLoading) return <ModelDistributionLoading />;
  if (error) return <ModelDistributionError error={error} />;
  if (chartData.length === 0 || modelBreakdown.length === 0) {
    return <ModelDistributionEmpty />;
  }

  return (
    <ModelDistributionChart
      chartData={chartData}
      chartConfig={chartConfig}
      modelBreakdown={modelBreakdown}
    />
  );
}
