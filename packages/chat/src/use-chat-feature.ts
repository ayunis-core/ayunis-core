import { useAppControllerFeatureToggles } from '@ayunis/api-client/endpoints';
import type { FeatureTogglesResponseDto } from '@ayunis/api-client/schemas';

/** Whether the instance turned a feature on; off until the toggles load. */
export function useChatFeature(feature: keyof FeatureTogglesResponseDto) {
  const toggles = useAppControllerFeatureToggles();
  return !toggles.error && toggles.data?.[feature] === true;
}
