import {
  useSuperAdminUsageDataControllerGetProviderUsageChart,
  type SuperAdminUsageDataControllerGetProviderUsageChartParams,
} from '@ayunis/api-client';

export function useSuperAdminProviderUsageChart(
  orgId: string,
  params?: SuperAdminUsageDataControllerGetProviderUsageChartParams,
) {
  return useSuperAdminUsageDataControllerGetProviderUsageChart(orgId, params);
}
