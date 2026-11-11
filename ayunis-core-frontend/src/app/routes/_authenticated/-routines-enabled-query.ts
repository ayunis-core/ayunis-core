import type { QueryClient } from '@tanstack/react-query';
import {
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { FeatureTogglesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function getFeatureToggles(
  queryClient: QueryClient,
): Promise<FeatureTogglesResponseDto> {
  return queryClient.query({
    queryKey: getAppControllerFeatureTogglesQueryKey(),
    queryFn: () => appControllerFeatureToggles(),
  });
}
