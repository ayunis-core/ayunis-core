import type { QueryClient } from '@tanstack/react-query';
import {
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getTeamsControllerListTeamsQueryKey,
  getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey,
  getTeamPermittedModelsControllerListTeamImageGenerationModelsQueryKey,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api';

export async function invalidateTeamModelAccessQueries(
  queryClient: QueryClient,
  teamId: string,
): Promise<void> {
  const queryKeys = [
    getTeamsControllerListTeamsQueryKey(),
    getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey(teamId),
    getTeamPermittedModelsControllerListTeamImageGenerationModelsQueryKey(
      teamId,
    ),
    getModelsControllerGetPermittedLanguageModelsQueryKey(),
    getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey(),
  ];

  await Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
