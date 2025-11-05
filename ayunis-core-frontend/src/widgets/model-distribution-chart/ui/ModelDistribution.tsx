// Utils
import { useMemo } from "react";

// Entities
import { useModelDistribution } from "@/entities/usage";

// UI
import { ModelDistributionLoading } from "./ModelDistributionLoading";
import { ModelDistributionError } from "./ModelDistributionError";
import { ModelDistributionEmpty } from "./ModelDistributionEmpty";
import { ModelDistributionChart } from "./ModelDistributionChart";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface ModelDistributionProps {
  startDate?: Date;
  endDate?: Date;
  selectedModel?: string;
}

export function ModelDistribution({ startDate, endDate, selectedModel }: ModelDistributionProps) {
  const { data: modelDistribution, isLoading, error } = useModelDistribution({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    maxModels: 10,
    modelId: selectedModel,
  } as Parameters<typeof useModelDistribution>[0]);

  // Prepare all chart data structures
  const { chartData, chartConfig, modelBreakdown } = useMemo(() => {
    if (!modelDistribution?.models) {
      return { chartData: [], chartConfig: {}, modelBreakdown: [] };
    }

    const models = modelDistribution.models;

    const chartDataItems: Array<{
      name: string;
      value: number;
      tokens: number;
      fill: string;
    }> = [];
    const configMap: Record<string, { label: string; color: string }> = {};
    const breakdownItems: Array<typeof models[0] & { color: string }> = [];

    models.forEach((model, index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length];
      
      chartDataItems.push({
        name: model.displayName,
        value: model.percentage,
        tokens: model.tokens,
        fill: color,
      });

      configMap[model.displayName] = {
        label: model.displayName,
        color: color,
      };

      breakdownItems.push({
        ...model,
        color: color,
      });
    });

    return {
      chartData: chartDataItems,
      chartConfig: configMap,
      modelBreakdown: breakdownItems,
    };
  }, [modelDistribution?.models]);

  if (isLoading) {
    return <ModelDistributionLoading />;
  }

  if (error) {
    return <ModelDistributionError error={error} />;
  }

  if (chartData.length === 0 || modelBreakdown.length === 0) {
    return <ModelDistributionEmpty />;
  }

  return (
    <ModelDistributionChart
      chartData={chartData}
      chartConfig={chartConfig}
      modelBreakdown={modelBreakdown}
    />
  );
}

