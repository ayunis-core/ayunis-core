import {
  useUsageControllerGetProviderUsage,
  type UsageControllerGetProviderUsageParams,
} from "@/shared/api";

export function useProviderUsage(
  params?: UsageControllerGetProviderUsageParams,
) {
  return useUsageControllerGetProviderUsage({
    ...params,
    includeTimeSeries: params?.includeTimeSeries ?? true,
  });
}
