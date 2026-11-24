import { useTeamPermittedModelsControllerListTeamPermittedModels } from '@ayunis/api-client/endpoints';

export function useTeamPermittedModels(teamId: string) {
  const {
    data: models = [],
    isLoading,
    isError,
  } = useTeamPermittedModelsControllerListTeamPermittedModels(teamId);

  return { models, isLoading, isError };
}
