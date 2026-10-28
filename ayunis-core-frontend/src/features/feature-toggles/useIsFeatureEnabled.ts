import type { FeatureTogglesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useFeatureToggles } from './useFeatureToggles';

export function useIsFeatureEnabled(
  feature: keyof FeatureTogglesResponseDto,
): boolean {
  const toggles = useFeatureToggles();
  return toggles[feature] === true;
}
