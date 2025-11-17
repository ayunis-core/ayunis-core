import {
  useUsageControllerGetProviderUsageChart,
  type UsageControllerGetProviderUsageChartParams,
} from "@/shared/api";

export function useProviderUsageChart(
  params?: UsageControllerGetProviderUsageChartParams
) {
  return useUsageControllerGetProviderUsageChart(params);
}


