import {
  useAdminUsageControllerGetProviderUsage,
  type AdminUsageControllerGetProviderUsageParams,
} from "@/shared/api";

export function useProviderUsage(params?: AdminUsageControllerGetProviderUsageParams) {
  return useAdminUsageControllerGetProviderUsage({
    ...params,
    includeTimeSeries: params?.includeTimeSeries ?? true,
  });
}

