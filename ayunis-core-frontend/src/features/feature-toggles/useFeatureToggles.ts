import { useAppControllerFeatureToggles } from '@/shared/api/generated/ayunisCoreAPI';
import type { FeatureTogglesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function useFeatureToggles(): FeatureTogglesResponseDto {
  const { data } = useAppControllerFeatureToggles();

  return {
    agentsEnabled: data?.agentsEnabled ?? true,
    knowledgeBasesEnabled: data?.knowledgeBasesEnabled ?? true,
    letterheadsEnabled: data?.letterheadsEnabled ?? false,
    promptsEnabled: data?.promptsEnabled ?? true,
    skillsEnabled: data?.skillsEnabled ?? false,
  };
}
