import {
  useSuperAdminUsageControllerGetUsageStats,
  type SuperAdminUsageControllerGetUsageStatsParams,
} from '@ayunis/api-client';

export function useSuperAdminUsageStats(
  orgId: string,
  params?: SuperAdminUsageControllerGetUsageStatsParams,
) {
  return useSuperAdminUsageControllerGetUsageStats(orgId, params);
}
