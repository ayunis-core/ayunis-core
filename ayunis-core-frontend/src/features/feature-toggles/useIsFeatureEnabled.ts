import type { FeatureTogglesResponseDto } from '@ayunis/api-client/schemas';
import { useFeatureToggles } from './useFeatureToggles';

export function useIsFeatureEnabled(
  feature: keyof FeatureTogglesResponseDto,
): boolean {
  const { toggles } = useFeatureToggles();
  return toggles?.[feature] === true;
}
