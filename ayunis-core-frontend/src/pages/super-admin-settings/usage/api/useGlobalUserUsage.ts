import {
  useSuperAdminGlobalUsageControllerGetGlobalUserUsage,
  type SuperAdminGlobalUsageControllerGetGlobalUserUsageParams,
} from '@/shared/api';

export function useGlobalUserUsage(
  params?: SuperAdminGlobalUsageControllerGetGlobalUserUsageParams,
) {
  return useSuperAdminGlobalUsageControllerGetGlobalUserUsage(params);
}
