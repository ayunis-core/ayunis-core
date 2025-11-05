import { useMemo } from "react";
import type { ToolUseMessageContent } from "@/pages/chat/model/openapi";
import { cn } from "@/shared/lib/shadcn/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.3)",
  "hsl(var(--primary) / 0.2)",
];

export default function BarChartWidget({
  content,
  isStreaming = false,
}: {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}) {
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
    return (
      <div
        className={cn(
          "my-2 w-full h-64 bg-muted animate-pulse rounded-lg",
          isLoading && "animate-pulse"
        )}
      />
    );
  }

  if (!hasData) {
    return (
      <div className="my-2 w-full p-4 text-sm text-muted-foreground">
        No chart data available
      </div>
    );
  }

  const yAxisSeries = params.yAxis || [];

  return (
    <div className="my-2 w-full space-y-4" key={`${content.name}-${content.id}`}>
      {params.chartTitle && (
        <h3 className="text-lg font-semibold">{params.chartTitle}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            className="text-xs"
          />
          <YAxis className="text-xs" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "calc(var(--radius) - 2px)",
            }}
          />
          <Legend />
          {yAxisSeries.map((series, index) => (
            <Bar
              key={series.label}
              dataKey={series.label}
              fill={COLORS[index % COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      {params.insight && params.insight.trim() && (
        <p className="text-sm text-muted-foreground">{params.insight}</p>
      )}
    </div>
  );
}

