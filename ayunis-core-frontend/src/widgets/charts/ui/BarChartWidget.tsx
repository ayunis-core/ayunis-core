// Utils
import { useMemo } from "react";

// Types
import type { ToolUseMessageContent } from "@/pages/chat/model/openapi";

// UI
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/shared/ui/shadcn/chart";
import { colorVar, seriesLabelsToConfig, computeChartWidth, CHART_COLORS } from "@/widgets/charts/lib/ChartUtils";
import { ChartCard } from "@/widgets/charts/ui/ChartCard";
import { XAxisTick } from "@/widgets/charts/ui/XAxisTick";
import { ChartLoadingState } from "@/widgets/charts/ui/ChartLoadingState";
import { ChartEmptyState } from "@/widgets/charts/ui/ChartEmptyState";

interface YAxisSeries {
  label: string;
  values: number[];
}

interface ChartParams {
  chartTitle?: string;
  xAxis?: string[];
  yAxis?: YAxisSeries[];
  insight?: string;
}

export default function BarChartWidget({
  content,
  isStreaming = false,
}: {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}) {
  const params = (content.params || {}) as ChartParams;
  const THRESHOLD = 10;
  const PER_POINT_PX = 70;

  const MAX_TICK_CHARS = 12;

  const chartData = useMemo(() => {
    const xAxis = params.xAxis || [];
    const yAxis = params.yAxis || [];

    if (xAxis.length === 0 || yAxis.length === 0) {
      return [];
    }

    // Transform data to recharts format
    // Each xAxis point becomes a data point with values from all series
    return xAxis.map((xLabel, index) => {
      const dataPoint: Record<string, string | number> = { name: xLabel };
      
      yAxis.forEach((series) => {
        if (series.values[index] !== undefined) {
          dataPoint[series.label] = series.values[index];
        }
      });
      
      return dataPoint;
    });
  }, [params.xAxis, params.yAxis]);

  const hasData = chartData.length > 0 && (params.yAxis || []).length > 0;
  const isLoading = isStreaming && !hasData;

  if (isLoading) {
    return <ChartLoadingState />;
  }

  if (!hasData) {
    return <ChartEmptyState />;
  }

  const yAxisSeries = params.yAxis || [];
  const dynamicWidth = computeChartWidth(chartData.length, THRESHOLD, PER_POINT_PX);

  return (
    <ChartCard
      title={params.chartTitle}
      insight={params.insight}
      config={seriesLabelsToConfig(
        yAxisSeries.map((s) => s.label),
        CHART_COLORS,
      )}
      containerStyle={dynamicWidth ? { width: dynamicWidth } : undefined}
      containerClassName="min-h-[300px]"
      key={`${content.name}-${content.id}`}
    >
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" tick={<XAxisTick maxChars={MAX_TICK_CHARS} doTruncate={chartData.length > THRESHOLD} />} />
        <YAxis className="text-xs" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {yAxisSeries.map((series) => (
          <Bar
            key={series.label}
            dataKey={series.label}
            fill={colorVar(series.label)}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartCard>
  );
}

