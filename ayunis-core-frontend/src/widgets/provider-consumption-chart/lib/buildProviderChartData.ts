const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

import type { ProviderTimeSeriesRowDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface ProviderChartData {
  chartData: Array<Record<string, string | number>>;
  chartConfig: Record<string, { label: string; color: string }>;
}

const EMPTY_RESULT: ProviderChartData = {
  chartData: [],
  chartConfig: {},
};

export function buildProviderChartData(
  timeSeries: ProviderTimeSeriesRowDto[] | undefined,
  providerDisplayNames: Record<string, string>,
): ProviderChartData {
  const rows = timeSeries ?? [];
  if (rows.length === 0) return EMPTY_RESULT;

  const seriesKeys = Object.keys(rows[0].values);
  const chartData = rows.map((r) => ({
    date: r.date,
    ...r.values,
  })) as Array<Record<string, string | number>>;

  const chartConfig: Record<string, { label: string; color: string }> = {};
  seriesKeys.forEach((key, idx) => {
    chartConfig[key] = {
      label: providerDisplayNames[key] || key,
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
    };
  });

  return { chartData, chartConfig };
}
