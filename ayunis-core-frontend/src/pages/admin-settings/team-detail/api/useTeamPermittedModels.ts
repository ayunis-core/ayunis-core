import { useTeamPermittedModelsControllerListTeamPermittedModels } from '@/shared/api/generated/ayunisCoreAPI';

export function useTeamPermittedModels(teamId: string) {
  const { data: models = [], isLoading } =
    useTeamPermittedModelsControllerListTeamPermittedModels(teamId);

  return { models, isLoading };
}
