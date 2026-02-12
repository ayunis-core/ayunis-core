import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuperAdminModelDistribution } from '../api/useSuperAdminModelDistribution';
import { ModelDistributionLoading } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/ModelDistributionLoading';
import { ModelDistributionError } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/ModelDistributionError';
import { ModelDistributionEmpty } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/ModelDistributionEmpty';
import { ModelDistributionChart } from '@/pages/admin-settings/usage-settings/ui/model-distribution-chart/ModelDistributionChart';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const MAX_DISPLAY_MODELS = 10;

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

  const { chartData, chartConfig, modelBreakdown } = useMemo(() => {
    if (!modelDistribution?.models || modelDistribution.models.length === 0) {
      return { chartData: [], chartConfig: {}, modelBreakdown: [] };
    }

    const models = modelDistribution.models;
    const totalTokens = models.reduce((sum, model) => sum + model.tokens, 0);

    if (totalTokens === 0) {
      return { chartData: [], chartConfig: {}, modelBreakdown: [] };
    }

    const topModels = models.slice(0, MAX_DISPLAY_MODELS);
    const otherModels = models.slice(MAX_DISPLAY_MODELS);

    const chartDataItems: Array<{
      name: string;
      value: number;
      tokens: number;
      fill: string;
    }> = [];
    const configMap: Record<string, { label: string; color: string }> = {};
    const breakdownItems: Array<(typeof models)[0] & { color: string }> = [];

    topModels.forEach((model, index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length];
      const percentage = (model.tokens / totalTokens) * 100;

      chartDataItems.push({
        name: model.displayName,
        value: percentage,
        tokens: model.tokens,
        fill: color,
      });
      configMap[model.displayName] = { label: model.displayName, color };
      breakdownItems.push({ ...model, percentage, color });
    });

    if (otherModels.length > 0) {
      const othersTokens = otherModels.reduce(
        (sum, model) => sum + model.tokens,
        0,
      );
      const othersRequests = otherModels.reduce(
        (sum, model) => sum + model.requests,
        0,
      );
      const othersPercentage = (othersTokens / totalTokens) * 100;
      const othersColor = CHART_COLORS[topModels.length % CHART_COLORS.length];
      const othersDisplayName = t('charts.modelDistribution.othersWithCount', {
        count: otherModels.length,
      });

      chartDataItems.push({
        name: othersDisplayName,
        value: othersPercentage,
        tokens: othersTokens,
        fill: othersColor,
      });
      configMap[othersDisplayName] = {
        label: othersDisplayName,
        color: othersColor,
      };
      breakdownItems.push({
        modelId: 'others',
        modelName: t('charts.modelDistribution.others'),
        displayName: othersDisplayName,
        provider: otherModels[0]?.provider || ('openai' as const),
        tokens: othersTokens,
        requests: othersRequests,
        percentage: othersPercentage,
        color: othersColor,
      });
    }

    return {
      chartData: chartDataItems,
      chartConfig: configMap,
      modelBreakdown: breakdownItems,
    };
  }, [modelDistribution?.models, t]);

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
