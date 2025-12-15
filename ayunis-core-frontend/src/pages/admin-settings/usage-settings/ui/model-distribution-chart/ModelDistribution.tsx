// Utils
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Features
import { useModelDistribution } from '@/features/usage';

// UI
import { ModelDistributionLoading } from './ModelDistributionLoading';
import { ModelDistributionError } from './ModelDistributionError';
import { ModelDistributionEmpty } from './ModelDistributionEmpty';
import { ModelDistributionChart } from './ModelDistributionChart';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const MAX_DISPLAY_MODELS = 10; // Number of individual models to show before grouping into "Others"

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

  // Prepare all chart data structures with frontend-side "Others" aggregation
  const { chartData, chartConfig, modelBreakdown } = useMemo(() => {
    if (!modelDistribution?.models || modelDistribution.models.length === 0) {
      return { chartData: [], chartConfig: {}, modelBreakdown: [] };
    }

    const models = modelDistribution.models;

    // Calculate total tokens for percentage recalculation
    const totalTokens = models.reduce((sum, model) => sum + model.tokens, 0);

    if (totalTokens === 0) {
      return { chartData: [], chartConfig: {}, modelBreakdown: [] };
    }

    // Models are already sorted by tokens (descending) from backend
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

    // Add top models
    topModels.forEach((model, index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length];
      const percentage = (model.tokens / totalTokens) * 100;

      chartDataItems.push({
        name: model.displayName,
        value: percentage,
        tokens: model.tokens,
        fill: color,
      });

      configMap[model.displayName] = {
        label: model.displayName,
        color: color,
      };

      breakdownItems.push({
        ...model,
        percentage,
        color: color,
      });
    });

    // Aggregate remaining models into "Others" if there are any
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

      // Use the next color for "Others"
      const othersColor = CHART_COLORS[topModels.length % CHART_COLORS.length];

      const othersLabel = t('charts.modelDistribution.others');
      const othersEntry = {
        modelId: 'others',
        modelName: othersLabel,
        displayName: t('charts.modelDistribution.othersWithCount', {
          count: otherModels.length,
        }),
        provider: otherModels[0]?.provider || ('openai' as const),
        tokens: othersTokens,
        requests: othersRequests,
        percentage: othersPercentage,
        color: othersColor,
      };

      chartDataItems.push({
        name: othersEntry.displayName,
        value: othersPercentage,
        tokens: othersTokens,
        fill: othersColor,
      });

      configMap[othersEntry.displayName] = {
        label: othersEntry.displayName,
        color: othersColor,
      };

      breakdownItems.push(othersEntry);
    }

    return {
      chartData: chartDataItems,
      chartConfig: configMap,
      modelBreakdown: breakdownItems,
    };
  }, [modelDistribution?.models, t]);

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
