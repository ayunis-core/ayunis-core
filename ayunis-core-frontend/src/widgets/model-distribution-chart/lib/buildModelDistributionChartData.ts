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
  credits: number;
  requests: number;
  percentage: number;
}

export interface ChartDataItem {
  name: string;
  value: number;
  credits: number;
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

  const totalCredits = models.reduce((sum, model) => sum + model.credits, 0);

  if (totalCredits === 0) {
    return EMPTY_RESULT;
  }

  const topModels = models.slice(0, MAX_DISPLAY_MODELS);
  const otherModels = models.slice(MAX_DISPLAY_MODELS);

  const chartData: ChartDataItem[] = [];
  const chartConfig: Record<string, ChartConfigEntry> = {};
  const modelBreakdown: ModelBreakdownItem[] = [];

  topModels.forEach((model, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const percentage = (model.credits / totalCredits) * 100;

    chartData.push({
      name: model.displayName,
      value: percentage,
      credits: model.credits,
      fill: color,
    });
    chartConfig[model.displayName] = { label: model.displayName, color };
    modelBreakdown.push({ ...model, percentage, color });
  });

  if (otherModels.length > 0) {
    appendOthersEntry(
      otherModels,
      totalCredits,
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
  totalCredits: number,
  topCount: number,
  t: (key: string, options?: Record<string, unknown>) => string,
  chartData: ChartDataItem[],
  chartConfig: Record<string, ChartConfigEntry>,
  modelBreakdown: ModelBreakdownItem[],
) {
  const othersCredits = otherModels.reduce((sum, m) => sum + m.credits, 0);
  const othersRequests = otherModels.reduce((sum, m) => sum + m.requests, 0);
  const othersPercentage = (othersCredits / totalCredits) * 100;
  const othersColor = CHART_COLORS[topCount % CHART_COLORS.length];
  const othersDisplayName = t('charts.modelDistribution.othersWithCount', {
    count: otherModels.length,
  });

  chartData.push({
    name: othersDisplayName,
    value: othersPercentage,
    credits: othersCredits,
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
    credits: othersCredits,
    requests: othersRequests,
    percentage: othersPercentage,
    color: othersColor,
  });
}
