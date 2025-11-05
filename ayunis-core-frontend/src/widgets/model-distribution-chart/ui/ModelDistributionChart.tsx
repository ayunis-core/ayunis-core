// Utils
import { useTranslation } from "react-i18next";

// UI
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/shadcn/chart";
import { UsageBlockHeader } from "./UsageBlockHeader";
import { Pie, PieChart, Cell } from "recharts";

interface ChartDataItem {
  name: string;
  value: number;
  tokens: number;
  fill: string;
}

interface ModelBreakdownItem {
  modelId: string;
  displayName: string;
  tokens: number;
  percentage: number;
  color: string;
}

interface ModelDistributionChartProps {
  chartData: ChartDataItem[];
  chartConfig: ChartConfig;
  modelBreakdown: ModelBreakdownItem[];
}

export function ModelDistributionChart({ chartData, chartConfig, modelBreakdown }: ModelDistributionChartProps) {
  const { t, i18n } = useTranslation("admin-settings-usage");

  const formatCompact = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      notation: "compact",
      maximumFractionDigits: 1,
      compactDisplay: "short",
    }).format(value);

  return (
    <div>
      <UsageBlockHeader
        title={t("charts.modelDistribution.title")}
        description={t("charts.modelDistribution.description")}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-center">
        <div className="relative flex flex-col items-center justify-center flex-shrink-0 w-full max-w-md">
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <PieChart>
              <defs>
                {chartData.map((item, idx) => (
                  <linearGradient id={`md-fill-${idx}`} key={idx} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={item.fill} stopOpacity={0.85} />
                    <stop offset="95%" stopColor={item.fill} stopOpacity={0.4} />
                  </linearGradient>
                ))}
              </defs>
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number, name, payload) => [
                  `${value.toFixed(1)}% `,
                  payload?.payload?.name ?? name,
                ]}
              />

              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={110}
                paddingAngle={2}
              >
                {chartData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={`url(#md-fill-${idx})`} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        <div className="flex-1 space-y-4 max-w-[200px]">
          {modelBreakdown.map((model) => (
            <div key={model.modelId} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: model.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{model.displayName}</div>
                  <span className="text-sm text-muted-foreground truncate">
                    {formatCompact(model.tokens)} tokens
                  </span>
                </div>
              </div>

              <span className="text-sm font-semibold flex-shrink-0">
                {model.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

