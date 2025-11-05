import { useMemo } from "react";
import type { ToolUseMessageContent } from "@/pages/chat/model/openapi";
import { cn } from "@/shared/lib/shadcn/utils";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PieDataPoint {
  label: string;
  value: number;
}

interface ChartParams {
  chartTitle?: string;
  data?: PieDataPoint[];
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

export default function PieChartWidget({
  content,
  isStreaming = false,
}: {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}) {
  const params = (content.params || {}) as ChartParams;

  const chartData = useMemo(() => {
    const data = params.data || [];
    
    if (data.length === 0) {
      return [];
    }

    // Transform to recharts format
    return data.map((item) => ({
      name: item.label,
      value: item.value,
    }));
  }, [params.data]);

  const hasData = chartData.length > 0;
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

  return (
    <div className="my-2 w-full space-y-4" key={`${content.name}-${content.id}`}>
      {params.chartTitle && (
        <h3 className="text-lg font-semibold">{params.chartTitle}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="hsl(var(--primary))"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "calc(var(--radius) - 2px)",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      {params.insight && params.insight.trim() && (
        <p className="text-sm text-muted-foreground">{params.insight}</p>
      )}
    </div>
  );
}
