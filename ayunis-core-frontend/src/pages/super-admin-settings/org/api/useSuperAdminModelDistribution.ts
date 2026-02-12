import {
  useSuperAdminUsageControllerGetModelDistribution,
  type SuperAdminUsageControllerGetModelDistributionParams,
} from '@/shared/api';

export function useSuperAdminModelDistribution(
  orgId: string,
  params?: SuperAdminUsageControllerGetModelDistributionParams,
) {
  return useSuperAdminUsageControllerGetModelDistribution(orgId, params);
}
