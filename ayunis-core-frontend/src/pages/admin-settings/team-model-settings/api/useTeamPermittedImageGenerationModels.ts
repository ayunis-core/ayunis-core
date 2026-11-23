import { useTeamPermittedModelsControllerListTeamImageGenerationModels } from '@ayunis/api-client/endpoints';

export function useTeamPermittedImageGenerationModels(teamId: string) {
  const {
    data: models = [],
    isLoading,
    isError,
  } = useTeamPermittedModelsControllerListTeamImageGenerationModels(teamId);

  return { models, isLoading, isError };
}
