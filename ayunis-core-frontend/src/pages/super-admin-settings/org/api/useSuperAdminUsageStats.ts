import {
  useSuperAdminUsageControllerGetUsageStats,
  type SuperAdminUsageControllerGetUsageStatsParams,
} from '@/shared/api';

export function useSuperAdminUsageStats(
  orgId: string,
  params?: SuperAdminUsageControllerGetUsageStatsParams,
) {
  return useSuperAdminUsageControllerGetUsageStats(orgId, params, {
    query: {
      // Active-users count changes with every chat message; override the
      // 5-min global staleTime so the card refreshes when the super-admin
      // navigates back to this page.
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });
}
