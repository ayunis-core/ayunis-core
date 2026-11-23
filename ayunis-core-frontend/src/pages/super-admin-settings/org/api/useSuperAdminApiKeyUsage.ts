import {
  useSuperAdminUsageDataControllerGetApiKeyUsage,
  type SuperAdminUsageDataControllerGetApiKeyUsageParams,
} from '@ayunis/api-client';

export function useSuperAdminApiKeyUsage(
  orgId: string,
  params?: SuperAdminUsageDataControllerGetApiKeyUsageParams,
) {
  return useSuperAdminUsageDataControllerGetApiKeyUsage(orgId, params);
}
