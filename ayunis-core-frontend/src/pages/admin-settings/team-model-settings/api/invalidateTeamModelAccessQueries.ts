import type { QueryClient } from '@tanstack/react-query';
import {
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getTeamsControllerListTeamsQueryKey,
  getModelModeDefaultsControllerGetDefaultSelectionQueryKey,
  getTeamPermittedModelsControllerListTeamImageGenerationModelsQueryKey,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api';
import { getModelModeDefaultQueryKey } from '@/features/model-mode-defaults';

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
    getModelModeDefaultsControllerGetDefaultSelectionQueryKey(),
    // Setting the team model default clears the team's mode default.
    getModelModeDefaultQueryKey({ level: 'team', teamId }),
  ];

  await Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
