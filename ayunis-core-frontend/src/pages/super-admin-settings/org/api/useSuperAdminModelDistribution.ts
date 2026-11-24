import {
  useSuperAdminUsageControllerGetModelDistribution,
  type SuperAdminUsageControllerGetModelDistributionParams,
} from '@ayunis/api-client';

export function useSuperAdminModelDistribution(
  orgId: string,
  params?: SuperAdminUsageControllerGetModelDistributionParams,
) {
  return useSuperAdminUsageControllerGetModelDistribution(orgId, params);
}
