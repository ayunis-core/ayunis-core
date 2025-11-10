// Types
import type { ToolUseMessageContent } from "@/pages/chat/model/openapi";
import type { YAxisSeries } from "@/widgets/charts/lib/ChartUtils";

// Utils
import { useMemo } from "react";
import { colorVar, seriesLabelsToConfig, slugifyForCssVar, transformChartData } from "@/widgets/charts/lib/ChartUtils";

// UI
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/shared/ui/shadcn/chart";
import { ChartCard } from "@/widgets/charts/ui/ChartCard";
import { XAxisTick } from "@/widgets/charts/ui/XAxisTick";
import { ChartLoadingState } from "@/widgets/charts/ui/ChartLoadingState";
import { ChartEmptyState } from "@/widgets/charts/ui/ChartEmptyState";

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
  const MAX_TICK_CHARS = 12;
  const PER_POINT_PX = 70;

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

  return (
    <ChartCard
      title={params.chartTitle}
      insight={params.insight}
      config={seriesLabelsToConfig(
        yAxisSeries.map((s) => s.label),
      )}
      xCount={chartData.length}
      threshold={THRESHOLD}
      perPointPx={PER_POINT_PX}
      key={`${content.name}-${content.id}`}
    >
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" tick={<XAxisTick maxChars={MAX_TICK_CHARS} doTruncate={chartData.length > THRESHOLD} />} />
        <YAxis className="text-xs" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {yAxisSeries.map((series, index) => {
          const slugifiedKey = slugifyForCssVar(series.label);
          return (
            <Bar
              key={`${series.label}-${index}`}
              dataKey={slugifiedKey}
              name={series.label}
              fill={colorVar(series.label)}
              radius={[4, 4, 0, 0]}
            />
          );
        })}
      </BarChart>
    </ChartCard>
  );
}

