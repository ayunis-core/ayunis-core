import type { ChartConfig } from "../../../shared/ui/shadcn/chart";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function slugifyForCssVar(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function colorVar(labelOrSlug: string): string {
  const key = slugifyForCssVar(labelOrSlug);

  return `var(--color-${key})`;
}

export function seriesLabelsToConfig(
  labels: string[],
  colors: string[],
): ChartConfig {
  return Object.fromEntries(
    labels.map((label, index) => [
      slugifyForCssVar(label),
      { label, color: colors[index % colors.length] },
    ]),
  );
}

export function pieNamesToConfig(
  names: Array<string | number>,
  colors: string[],
): ChartConfig {
  return Object.fromEntries(
    names.map((name, index) => [
      slugifyForCssVar(String(name)),
      { label: String(name), color: colors[index % colors.length] },
    ]),
  );
}

export function computeChartWidth(
  xCount: number,
  threshold = 10,
  perPointPx = 70,
): number | undefined {
  return xCount > threshold ? xCount * perPointPx : undefined;
}


