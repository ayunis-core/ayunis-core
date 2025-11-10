// Types
import type { ToolUseMessageContent } from "@/pages/chat/model/openapi";
import type { PieDataPoint } from "@/widgets/charts/lib/ChartUtils";

// Utils
import { useMemo } from "react";
import { colorVar, pieNamesToConfig, transformPieChartData } from "@/widgets/charts/lib/ChartUtils";

// UI
import { PieChart, Pie, Cell } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/shared/ui/shadcn/chart";
import { ChartCard } from "@/widgets/charts/ui/ChartCard";
import { ChartLoadingState } from "@/widgets/charts/ui/ChartLoadingState";
import { ChartEmptyState } from "@/widgets/charts/ui/ChartEmptyState";

interface ChartParams {
  chartTitle?: string;
  data?: PieDataPoint[];
  insight?: string;
}

export default function PieChartWidget({
  content,
  isStreaming = false,
}: {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}) {
  const params = (content.params || {}) as ChartParams;

  const chartData = useMemo(() => {
    return transformPieChartData(params.data || []);
  }, [params.data]);

  const hasData = chartData.length > 0;
  const isLoading = isStreaming && !hasData;

  if (isLoading) {
    return <ChartLoadingState />;
  }

  if (!hasData) {
    return <ChartEmptyState />;
  }

  return (
    <ChartCard
      title={params.chartTitle}
      insight={params.insight}
      config={pieNamesToConfig(
        chartData.map((e) => e.name),
      )}
      key={`${content.name}-${content.id}`}
    >
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name}: ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={100}
          innerRadius={80}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell key={`pie-${entry.name}`} name={entry.name} fill={colorVar(String(entry.name))} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartCard>
  );
}
