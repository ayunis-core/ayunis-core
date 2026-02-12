import {
  useSuperAdminGlobalUsageControllerGetGlobalModelDistribution,
  type SuperAdminGlobalUsageControllerGetGlobalModelDistributionParams,
} from '@/shared/api';

export function useGlobalModelDistribution(
  params?: SuperAdminGlobalUsageControllerGetGlobalModelDistributionParams,
) {
  return useSuperAdminGlobalUsageControllerGetGlobalModelDistribution(params);
}
