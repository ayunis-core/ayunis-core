import {
  useSuperAdminUsageDataControllerGetApiKeyUsage,
  type SuperAdminUsageDataControllerGetApiKeyUsageParams,
} from '@/shared/api';

export function useSuperAdminApiKeyUsage(
  orgId: string,
  params?: SuperAdminUsageDataControllerGetApiKeyUsageParams,
) {
  return useSuperAdminUsageDataControllerGetApiKeyUsage(orgId, params);
}
