import {
  useSuperAdminUsageDataControllerGetUserUsage,
  type SuperAdminUsageDataControllerGetUserUsageParams,
} from '@/shared/api';

export function useSuperAdminUserUsage(
  orgId: string,
  params?: SuperAdminUsageDataControllerGetUserUsageParams,
) {
  return useSuperAdminUsageDataControllerGetUserUsage(orgId, params);
}
