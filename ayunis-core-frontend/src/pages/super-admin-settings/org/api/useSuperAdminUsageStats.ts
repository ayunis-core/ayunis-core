import {
  useSuperAdminUsageControllerGetUsageStats,
  type SuperAdminUsageControllerGetUsageStatsParams,
} from '@/shared/api';

export function useSuperAdminUsageStats(
  orgId: string,
  params?: SuperAdminUsageControllerGetUsageStatsParams,
) {
  return useSuperAdminUsageControllerGetUsageStats(orgId, params);
}
