import type { FeatureTogglesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useFeatureToggles } from './useFeatureToggles';

export function useIsFeatureEnabled(
  feature: keyof FeatureTogglesResponseDto,
): boolean {
  const toggles = useFeatureToggles();
  return toggles[feature];
}

export function useIsAgentsEnabled(): boolean {
  return useIsFeatureEnabled('agentsEnabled');
}

export function useIsKnowledgeBasesEnabled(): boolean {
  return useIsFeatureEnabled('knowledgeBasesEnabled');
}

export function useIsLetterheadsEnabled(): boolean {
  return useIsFeatureEnabled('letterheadsEnabled');
}

export function useIsSkillsEnabled(): boolean {
  return useIsFeatureEnabled('skillsEnabled');
}
