const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const MAX_DISPLAY_MODELS = 10;

export interface ModelDistributionModel {
  modelId: string;
  modelName: string;
  displayName: string;
  provider: string;
  tokens: number;
  requests: number;
  percentage: number;
}

export interface ChartDataItem {
  name: string;
  value: number;
  tokens: number;
  fill: string;
}

export interface ChartConfig {
  [key: string]: { label: string; color: string };
}

export interface ModelBreakdownItem extends ModelDistributionModel {
  color: string;
}

export interface BuildModelChartDataResult {
  chartData: ChartDataItem[];
  chartConfig: ChartConfig;
  modelBreakdown: ModelBreakdownItem[];
}

export function buildModelChartData(
  models: ModelDistributionModel[],
  t: (key: string, options?: Record<string, unknown>) => string,
): BuildModelChartDataResult {
  if (!models || models.length === 0) {
    return { chartData: [], chartConfig: {}, modelBreakdown: [] };
  }

  const totalTokens = models.reduce((sum, model) => sum + model.tokens, 0);

  if (totalTokens === 0) {
    return { chartData: [], chartConfig: {}, modelBreakdown: [] };
  }

  const topModels = models.slice(0, MAX_DISPLAY_MODELS);
  const otherModels = models.slice(MAX_DISPLAY_MODELS);

  const chartData: ChartDataItem[] = [];
  const chartConfig: ChartConfig = {};
  const modelBreakdown: ModelBreakdownItem[] = [];

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
    const othersTokens = otherModels.reduce((sum, m) => sum + m.tokens, 0);
    const othersRequests = otherModels.reduce((sum, m) => sum + m.requests, 0);
    const othersPercentage = (othersTokens / totalTokens) * 100;
    const othersColor = CHART_COLORS[topModels.length % CHART_COLORS.length];
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

  return { chartData, chartConfig, modelBreakdown };
}
