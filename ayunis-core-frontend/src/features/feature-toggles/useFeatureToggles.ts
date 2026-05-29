import { useAppControllerFeatureToggles } from '@/shared/api/generated/ayunisCoreAPI';
import type { FeatureTogglesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function useFeatureToggles(): FeatureTogglesResponseDto {
  const { data } = useAppControllerFeatureToggles();

  return {
    knowledgeBasesEnabled: data?.knowledgeBasesEnabled ?? true,
    letterheadsEnabled: data?.letterheadsEnabled ?? false,
    skillsEnabled: data?.skillsEnabled ?? false,
  };
}
