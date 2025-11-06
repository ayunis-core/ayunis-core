// Utils
import { useMemo } from "react";

// Types
import type { ToolUseMessageContent } from "@/pages/chat/model/openapi";

// UI
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/shared/ui/shadcn/chart";
import { colorVar, computeChartWidth, seriesLabelsToConfig, CHART_COLORS } from "@/widgets/charts/lib/ChartUtils";
import { ChartCard } from "@/widgets/charts/ui/ChartCard";
import { ChartLoadingState } from "@/widgets/charts/ui/ChartLoadingState";
import { ChartEmptyState } from "@/widgets/charts/ui/ChartEmptyState";
import { XAxisTick } from "@/widgets/charts/ui/XAxisTick";

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

export default function LineChartWidget({
  content,
  isStreaming = false,
}: {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}) {
  const THRESHOLD = 10;
  const PER_POINT_PX = 70;
  const MAX_TICK_CHARS = 12;

  const params = (content.params || {}) as ChartParams;

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
  const xCount = (params.xAxis?.length ?? chartData.length);
  const dynamicWidth = computeChartWidth(xCount, THRESHOLD, PER_POINT_PX);

  return (
    <ChartCard
      title={params.chartTitle}
      insight={params.insight}
      config={seriesLabelsToConfig(
        yAxisSeries.map((s) => s.label),
        CHART_COLORS,
      )}
      containerStyle={dynamicWidth ? { width: dynamicWidth } : undefined}
      containerClassName="min-h-[300px] max-h-[400px]"
      key={`${content.name}-${content.id}`}
    >
      <LineChart data={chartData}>
        <CartesianGrid />
        <XAxis dataKey="name" tick={<XAxisTick maxChars={MAX_TICK_CHARS} doTruncate={xCount > THRESHOLD} />} />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {yAxisSeries.map((series, index) => (
          <Line
            key={`${series.label}-${index}`}
            type="monotone"
            dataKey={series.label}
            stroke={colorVar(series.label)}
            strokeWidth={2}
            dot={{ fill: colorVar(series.label), r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ChartCard>
  );
}

