import {
  useSuperAdminGlobalUsageControllerGetGlobalProviderUsageChart,
  type SuperAdminGlobalUsageControllerGetGlobalProviderUsageChartParams,
} from '@/shared/api';

export function useGlobalProviderUsageChart(
  params?: SuperAdminGlobalUsageControllerGetGlobalProviderUsageChartParams,
) {
  return useSuperAdminGlobalUsageControllerGetGlobalProviderUsageChart(params);
}
