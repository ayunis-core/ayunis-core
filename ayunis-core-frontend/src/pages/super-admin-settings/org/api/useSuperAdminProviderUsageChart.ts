import {
  useSuperAdminUsageDataControllerGetProviderUsageChart,
  type SuperAdminUsageDataControllerGetProviderUsageChartParams,
} from '@/shared/api';

export function useSuperAdminProviderUsageChart(
  orgId: string,
  params?: SuperAdminUsageDataControllerGetProviderUsageChartParams,
) {
  return useSuperAdminUsageDataControllerGetProviderUsageChart(orgId, params);
}
