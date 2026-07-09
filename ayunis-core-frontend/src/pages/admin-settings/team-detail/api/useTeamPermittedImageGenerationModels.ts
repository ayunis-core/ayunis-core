import { useTeamPermittedModelsControllerListTeamImageGenerationModels } from '@/shared/api/generated/ayunisCoreAPI';

export function useTeamPermittedImageGenerationModels(teamId: string) {
  const { data: models = [], isLoading } =
    useTeamPermittedModelsControllerListTeamImageGenerationModels(teamId);

  return { models, isLoading };
}
