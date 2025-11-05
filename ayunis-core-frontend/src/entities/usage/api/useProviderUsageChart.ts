import {
  useAdminUsageControllerGetProviderUsageChart,
  type AdminUsageControllerGetProviderUsageChartParams,
} from "@/shared/api";

export function useProviderUsageChart(
  params?: AdminUsageControllerGetProviderUsageChartParams
) {
  return useAdminUsageControllerGetProviderUsageChart(params);
}


