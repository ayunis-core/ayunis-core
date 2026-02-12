import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuperAdminModelDistribution } from '../api/useSuperAdminModelDistribution';
import { ModelDistributionLoading } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/ModelDistributionLoading';
import { ModelDistributionError } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/ModelDistributionError';
import { ModelDistributionEmpty } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/ModelDistributionEmpty';
import { ModelDistributionChart } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/ModelDistributionChart';
import { buildModelChartData } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/buildModelChartData';

interface SuperAdminModelDistributionProps {
  orgId: string;
  startDate?: Date;
  endDate?: Date;
  selectedModel?: string;
}

export function SuperAdminModelDistribution({
  orgId,
  startDate,
  endDate,
  selectedModel,
}: SuperAdminModelDistributionProps) {
  const { t } = useTranslation('admin-settings-usage');
  const {
    data: modelDistribution,
    isLoading,
    error,
  } = useSuperAdminModelDistribution(orgId, {
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    modelId: selectedModel,
  });

  const { chartData, chartConfig, modelBreakdown } = useMemo(
    () => buildModelChartData(modelDistribution?.models || [], t),
    [modelDistribution?.models, t],
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
