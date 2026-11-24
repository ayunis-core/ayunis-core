import type { QueryClient } from '@tanstack/react-query';
import {
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@ayunis/api-client/endpoints';
import type { FeatureTogglesResponseDto } from '@ayunis/api-client/schemas';

export function getFeatureToggles(
  queryClient: QueryClient,
): Promise<FeatureTogglesResponseDto> {
  return queryClient.query({
    queryKey: getAppControllerFeatureTogglesQueryKey(),
    queryFn: () => appControllerFeatureToggles(),
  });
}
