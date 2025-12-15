// Utils
import { useMemo } from "react";

// Features
import { useProviderUsageChart } from "@/features/usage";
import { usePermittedProviders } from "@/features/models";

// UI
import { ProviderConsumptionLoading } from "./ProviderConsumptionLoading";
import { ProviderConsumptionError } from "./ProviderConsumptionError";
import { ProviderConsumptionEmpty } from "./ProviderConsumptionEmpty";
import { ProviderConsumptionChart } from "./ProviderConsumptionChart";

interface ProviderConsumptionProps {
  startDate?: Date;
  endDate?: Date;
  selectedProvider?: string;
}

export function ProviderConsumption({ startDate, endDate, selectedProvider }: ProviderConsumptionProps) {
  const { data: chartResp, isLoading, error } = useProviderUsageChart({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    provider: selectedProvider,
  } as Parameters<typeof useProviderUsageChart>[0]);

  const { providers } = usePermittedProviders();

  // Create a map from technical provider name to display name
  const providerDisplayNames = useMemo(() => {
    const map: Record<string, string> = {};
    providers.forEach((p) => {
      map[p.provider] = p.displayName;
    });
    return map;
  }, [providers]);

  const { chartData, chartConfig } = useMemo(() => {
    const empty = { chartData: [] as Array<Record<string, string | number>>, chartConfig: {} as Record<string, { label: string; color: string }> };
    const rows = chartResp?.timeSeries ?? [];
    if (rows.length === 0) return empty;

    const seriesKeys = Object.keys(rows[0].values ?? {});
    const chartData = rows.map((r) => ({ date: r.date, ...r.values }));

    const palette = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];
    const chartConfig: Record<string, { label: string; color: string }> = {};
    seriesKeys.forEach((key, idx) => {
      chartConfig[key] = { label: providerDisplayNames[key] || key, color: palette[idx % palette.length] };
    });

    return { chartData, chartConfig };
  }, [chartResp?.timeSeries, providerDisplayNames]);

  if (isLoading) {
    return <ProviderConsumptionLoading />;
  }

  if (error) {
    return <ProviderConsumptionError error={error} />;
  }

  if (!chartData || chartData.length === 0) {
    return <ProviderConsumptionEmpty />;
  }

  return (
    <ProviderConsumptionChart 
      chartData={chartData} 
      chartConfig={chartConfig} 
    />
  );
}
