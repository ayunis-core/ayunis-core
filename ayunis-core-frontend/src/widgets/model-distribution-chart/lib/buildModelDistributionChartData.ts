const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const MAX_DISPLAY_MODELS = 10;

interface ModelEntry {
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

export interface ChartConfigEntry {
  label: string;
  color: string;
}

export interface ModelBreakdownItem extends ModelEntry {
  color: string;
}

export interface ModelDistributionChartData {
  chartData: ChartDataItem[];
  chartConfig: Record<string, ChartConfigEntry>;
  modelBreakdown: ModelBreakdownItem[];
}

const EMPTY_RESULT: ModelDistributionChartData = {
  chartData: [],
  chartConfig: {},
  modelBreakdown: [],
};

export function buildModelDistributionChartData(
  models: ModelEntry[] | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): ModelDistributionChartData {
  if (!models || models.length === 0) {
    return EMPTY_RESULT;
  }

  const totalTokens = models.reduce((sum, model) => sum + model.tokens, 0);

  if (totalTokens === 0) {
    return EMPTY_RESULT;
  }

  const topModels = models.slice(0, MAX_DISPLAY_MODELS);
  const otherModels = models.slice(MAX_DISPLAY_MODELS);

  const chartData: ChartDataItem[] = [];
  const chartConfig: Record<string, ChartConfigEntry> = {};
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
  otherModels: ModelEntry[],
  totalTokens: number,
  topCount: number,
  t: (key: string, options?: Record<string, unknown>) => string,
  chartData: ChartDataItem[],
  chartConfig: Record<string, ChartConfigEntry>,
  modelBreakdown: ModelBreakdownItem[],
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
