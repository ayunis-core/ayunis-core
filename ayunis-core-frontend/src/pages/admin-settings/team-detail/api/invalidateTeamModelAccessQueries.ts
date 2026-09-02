import type { QueryClient } from '@tanstack/react-query';
import {
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey,
  getTeamPermittedModelsControllerListTeamImageGenerationModelsQueryKey,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api';

export async function invalidateTeamModelAccessQueries(
  queryClient: QueryClient,
  teamId: string,
): Promise<void> {
  const queryKeys = [
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
