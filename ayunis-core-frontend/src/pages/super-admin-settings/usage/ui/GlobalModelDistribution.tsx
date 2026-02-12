import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobalModelDistribution } from '../api/useGlobalModelDistribution';
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

interface GlobalModelDistributionProps {
  startDate?: Date;
  endDate?: Date;
  selectedModel?: string;
}

export function GlobalModelDistribution({
  startDate,
  endDate,
  selectedModel,
}: GlobalModelDistributionProps) {
  const { t } = useTranslation('admin-settings-usage');
  const {
    data: modelDistribution,
    isLoading,
    error,
  } = useGlobalModelDistribution({
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

    return buildChartData(models, totalTokens, t);
  }, [modelDistribution, t]);

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

function buildChartData(
  models: Array<{
    modelId: string;
    modelName: string;
    displayName: string;
    provider: string;
    tokens: number;
    requests: number;
    percentage: number;
  }>,
  totalTokens: number,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const topModels = models.slice(0, MAX_DISPLAY_MODELS);
  const otherModels = models.slice(MAX_DISPLAY_MODELS);

  const chartData: Array<{
    name: string;
    value: number;
    tokens: number;
    fill: string;
  }> = [];
  const chartConfig: Record<string, { label: string; color: string }> = {};
  const modelBreakdown: Array<(typeof models)[0] & { color: string }> = [];

  topModels.forEach((model, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const percentage = (model.tokens / totalTokens) * 100;

    chartData.push({
      name: model.displayName,
      value: percentage,
      tokens: model.tokens,
      fill: color,
    });
    chartConfig[model.displayName] = { label: model.displayName, color };
    modelBreakdown.push({ ...model, percentage, color });
  });

  if (otherModels.length > 0) {
    appendOthersEntry(
      otherModels,
      totalTokens,
      topModels.length,
      t,
      chartData,
      chartConfig,
      modelBreakdown,
    );
  }

  return { chartData, chartConfig, modelBreakdown };
}

function appendOthersEntry(
  otherModels: Array<{
    modelId: string;
    modelName: string;
    displayName: string;
    provider: string;
    tokens: number;
    requests: number;
    percentage: number;
  }>,
  totalTokens: number,
  topCount: number,
  t: (key: string, options?: Record<string, unknown>) => string,
  chartData: Array<{
    name: string;
    value: number;
    tokens: number;
    fill: string;
  }>,
  chartConfig: Record<string, { label: string; color: string }>,
  modelBreakdown: Array<{
    modelId: string;
    modelName: string;
    displayName: string;
    provider: string;
    tokens: number;
    requests: number;
    percentage: number;
    color: string;
  }>,
) {
  const othersTokens = otherModels.reduce((sum, m) => sum + m.tokens, 0);
  const othersRequests = otherModels.reduce((sum, m) => sum + m.requests, 0);
  const othersPercentage = (othersTokens / totalTokens) * 100;
  const othersColor = CHART_COLORS[topCount % CHART_COLORS.length];
  const othersDisplayName = t('charts.modelDistribution.othersWithCount', {
    count: otherModels.length,
  });

  chartData.push({
    name: othersDisplayName,
    value: othersPercentage,
    tokens: othersTokens,
    fill: othersColor,
  });
  chartConfig[othersDisplayName] = {
    label: othersDisplayName,
    color: othersColor,
  };
  modelBreakdown.push({
    modelId: 'others',
    modelName: t('charts.modelDistribution.others'),
    displayName: othersDisplayName,
    provider: otherModels[0]?.provider || 'openai',
    tokens: othersTokens,
    requests: othersRequests,
    percentage: othersPercentage,
    color: othersColor,
  });
}
