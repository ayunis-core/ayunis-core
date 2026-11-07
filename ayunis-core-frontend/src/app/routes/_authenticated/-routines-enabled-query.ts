import type { QueryClient } from '@tanstack/react-query';
import {
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export async function isRoutinesEnabled(
  queryClient: QueryClient,
): Promise<boolean> {
  const toggles = await queryClient.query({
    queryKey: getAppControllerFeatureTogglesQueryKey(),
    queryFn: () => appControllerFeatureToggles(),
  });
  return toggles.routinesEnabled;
}
