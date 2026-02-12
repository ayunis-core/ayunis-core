// Utils
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Features
import { useModelDistribution } from '@/pages/admin-settings/usage-settings/api';

// UI
import { ModelDistributionLoading } from './ModelDistributionLoading';
import { ModelDistributionError } from './ModelDistributionError';
import { ModelDistributionEmpty } from './ModelDistributionEmpty';
import { ModelDistributionChart } from './ModelDistributionChart';
import { buildModelChartData } from './buildModelChartData';

interface ModelDistributionProps {
  startDate?: Date;
  endDate?: Date;
  selectedModel?: string;
}

export function ModelDistribution({
  startDate,
  endDate,
  selectedModel,
}: ModelDistributionProps) {
  const { t } = useTranslation('admin-settings-usage');
  const {
    data: modelDistribution,
    isLoading,
    error,
  } = useModelDistribution({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    modelId: selectedModel,
  });

  const { chartData, chartConfig, modelBreakdown } = useMemo(
    () => buildModelChartData(modelDistribution?.models || [], t),
    [modelDistribution?.models, t],
  );

  if (isLoading) {
    return <ModelDistributionLoading />;
  }

  if (error) {
    return <ModelDistributionError error={error} />;
  }

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
