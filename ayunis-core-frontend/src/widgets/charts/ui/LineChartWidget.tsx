// Utils
import { useMemo } from "react";

// Types
import type { ToolUseMessageContent } from "@/pages/chat/model/openapi";

// UI
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/shared/ui/shadcn/chart";
import { colorVar, seriesLabelsToConfig, slugifyForCssVar, transformChartData, type YAxisSeries } from "@/widgets/charts/lib/ChartUtils";
import { ChartCard } from "@/widgets/charts/ui/ChartCard";
import { ChartLoadingState } from "@/widgets/charts/ui/ChartLoadingState";
import { ChartEmptyState } from "@/widgets/charts/ui/ChartEmptyState";
import { XAxisTick } from "@/widgets/charts/ui/XAxisTick";

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
  const MAX_TICK_CHARS = 12;
  const PER_POINT_PX = 70;

  const params = (content.params || {}) as ChartParams;

  const chartData = useMemo(() => {
    return transformChartData(params.xAxis || [], params.yAxis || []);
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

  return (
    <ChartCard
      title={params.chartTitle}
      insight={params.insight}
      config={seriesLabelsToConfig(
        yAxisSeries.map((s) => s.label),
      )}
      xCount={xCount}
      threshold={THRESHOLD}
      perPointPx={PER_POINT_PX}
      key={`${content.name}-${content.id}`}
    >
      <LineChart data={chartData}>
        <CartesianGrid />
        <XAxis dataKey="name" tick={<XAxisTick maxChars={MAX_TICK_CHARS} doTruncate={xCount > THRESHOLD} />} />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {yAxisSeries.map((series, index) => {
          const slugifiedKey = slugifyForCssVar(series.label);
          return (
            <Line
              key={`${series.label}-${index}`}
              type="monotone"
              dataKey={slugifiedKey}
              name={series.label}
              stroke={colorVar(series.label)}
              strokeWidth={2}
              dot={{ fill: colorVar(series.label), r: 4 }}
              activeDot={{ r: 6 }}
            />
          );
        })}
      </LineChart>
    </ChartCard>
  );
}

