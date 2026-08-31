import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey,
  getTeamPermittedModelsControllerListTeamImageGenerationModelsQueryKey,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api';
import { invalidateTeamModelAccessQueries } from './invalidateTeamModelAccessQueries';

describe(invalidateTeamModelAccessQueries.name, () => {
  it('invalidates team grants and current effective model policy', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const teamId = '00000000-0000-0000-0000-000000000870';

    await invalidateTeamModelAccessQueries(queryClient, teamId);

    expect(invalidateQueries).toHaveBeenCalledTimes(4);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey:
        getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey(teamId),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey:
        getTeamPermittedModelsControllerListTeamImageGenerationModelsQueryKey(
          teamId,
        ),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getModelsControllerGetPermittedLanguageModelsQueryKey(),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey(),
    });
  });
});
