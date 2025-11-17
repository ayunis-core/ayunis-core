import type { ChartConfig } from '../../../shared/ui/shadcn/chart';

export interface YAxisSeries {
  label: string;
  values: number[];
}

export interface PieDataPoint {
  label: string;
  value: number;
}

export interface TransformedPieDataPoint {
  name: string;
  value: number;
  slug: string;
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function slugifyForCssVar(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function colorVar(labelOrSlug: string): string {
  const key = slugifyForCssVar(labelOrSlug);

  return `var(--color-${key})`;
}

export function seriesLabelsToConfig(labels: string[]): ChartConfig {
  return Object.fromEntries(
    labels.map((label, index) => [
      slugifyForCssVar(label),
      { label, color: CHART_COLORS[index % CHART_COLORS.length] },
    ]),
  );
}

export function pieNamesToConfig(names: Array<string | number>): ChartConfig {
  return Object.fromEntries(
    names.map((name, index) => [
      slugifyForCssVar(String(name)),
      { label: String(name), color: CHART_COLORS[index % CHART_COLORS.length] },
    ]),
  );
}

export function transformChartData(
  xAxis: string[],
  yAxis: YAxisSeries[],
): Array<Record<string, string | number>> {
  if (xAxis.length === 0 || yAxis.length === 0) {
    return [];
  }

  // Transform data to recharts format
  // Each xAxis point becomes a data point with values from all series
  return xAxis.map((xLabel, index) => {
    const dataPoint: Record<string, string | number> = { name: xLabel };

    yAxis.forEach((series) => {
      if (series.values[index] !== undefined) {
        const slugifiedKey = slugifyForCssVar(series.label);

        dataPoint[slugifiedKey] = series.values[index];
      }
    });

    return dataPoint;
  });
}

export function transformPieChartData(
  data: PieDataPoint[],
): TransformedPieDataPoint[] {
  if (data.length === 0) {
    return [];
  }

  // Transform to recharts format
  return data.map((item) => ({
    name: item.label,
    value: item.value,
    slug: slugifyForCssVar(item.label),
  }));
}
