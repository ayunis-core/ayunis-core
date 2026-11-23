import {
  useSuperAdminUsageDataControllerGetUserUsage,
  type SuperAdminUsageDataControllerGetUserUsageParams,
} from '@ayunis/api-client';

export function useSuperAdminUserUsage(
  orgId: string,
  params?: SuperAdminUsageDataControllerGetUserUsageParams,
) {
  return useSuperAdminUsageDataControllerGetUserUsage(orgId, params);
}
