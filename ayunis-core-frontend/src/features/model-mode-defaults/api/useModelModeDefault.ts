import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getModelModeDefaultsControllerGetDefaultSelectionQueryKey,
  getModelModeDefaultsControllerGetOrgModeDefaultQueryKey,
  getModelModeDefaultsControllerGetTeamModeDefaultQueryKey,
  getModelModeDefaultsControllerGetUserModeDefaultQueryKey,
  modelModeDefaultsControllerGetOrgModeDefault,
  modelModeDefaultsControllerGetTeamModeDefault,
  modelModeDefaultsControllerGetUserModeDefault,
  modelModeDefaultsControllerSetOrgModeDefault,
  modelModeDefaultsControllerSetTeamModeDefault,
  modelModeDefaultsControllerSetUserModeDefault,
  type ModelMode,
  type ModelModeDefaultResponseDto,
  type SetModelModeDefaultDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export type ModelModeDefaultLevel =
  { level: 'user' } | { level: 'org' } | { level: 'team'; teamId: string };

interface LevelApi {
  queryKey: readonly unknown[];
  get: () => Promise<ModelModeDefaultResponseDto>;
  set: (dto: SetModelModeDefaultDto) => Promise<void>;
}

function levelApi(target: ModelModeDefaultLevel): LevelApi {
  switch (target.level) {
    case 'user':
      return {
        queryKey: getModelModeDefaultsControllerGetUserModeDefaultQueryKey(),
        get: () => modelModeDefaultsControllerGetUserModeDefault(),
        set: (dto) => modelModeDefaultsControllerSetUserModeDefault(dto),
      };
    case 'org':
      return {
        queryKey: getModelModeDefaultsControllerGetOrgModeDefaultQueryKey(),
        get: () => modelModeDefaultsControllerGetOrgModeDefault(),
        set: (dto) => modelModeDefaultsControllerSetOrgModeDefault(dto),
      };
    case 'team':
      return {
        queryKey: getModelModeDefaultsControllerGetTeamModeDefaultQueryKey(
          target.teamId,
        ),
        get: () => modelModeDefaultsControllerGetTeamModeDefault(target.teamId),
        set: (dto) =>
          modelModeDefaultsControllerSetTeamModeDefault(target.teamId, dto),
      };
  }
}

/** Query key of a level's mode default, for invalidation after a model default changes. */
export function getModelModeDefaultQueryKey(target: ModelModeDefaultLevel) {
  return levelApi(target).queryKey;
}

/**
 * A model default set on a level clears that level's mode default on the
 * server; mirror that in the cache so the picker shows the model right away.
 * Returns a rollback for the mutation's `onError`.
 */
export async function clearModelModeDefaultCache(
  queryClient: QueryClient,
  target: ModelModeDefaultLevel,
): Promise<() => void> {
  const { queryKey } = levelApi(target);
  await queryClient.cancelQueries({ queryKey });
  const previous =
    queryClient.getQueryData<ModelModeDefaultResponseDto>(queryKey);
  if (previous) {
    queryClient.setQueryData<ModelModeDefaultResponseDto>(queryKey, {
      ...previous,
      mode: null,
      currentPermittedModelId: null,
    });
  }
  return () => queryClient.setQueryData(queryKey, previous);
}

export function useModelModeDefault(target: ModelModeDefaultLevel) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const api = levelApi(target);

  const { data, isLoading } = useQuery({
    queryKey: api.queryKey,
    queryFn: api.get,
  });

  const mutation = useMutation({
    mutationFn: (mode: ModelMode | null) => api.set({ mode }),
    onMutate: async (mode) => {
      await queryClient.cancelQueries({ queryKey: api.queryKey });
      const previous = queryClient.getQueryData<ModelModeDefaultResponseDto>(
        api.queryKey,
      );
      queryClient.setQueryData<ModelModeDefaultResponseDto>(api.queryKey, {
        availableModes: previous?.availableModes ?? [],
        mode,
        // The new mode's model is unknown until the refetch.
        currentPermittedModelId:
          previous?.mode === mode ? previous.currentPermittedModelId : null,
      });
      return { previous };
    },
    onSuccess: () => {
      showSuccess(t('models.modes.defaultSaved'));
    },
    // Returned so isSaving holds until the refetched resolved model is in;
    // otherwise the "Currently" hint briefly shows the empty state.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: api.queryKey }),
        queryClient.invalidateQueries({
          queryKey: getModelModeDefaultsControllerGetDefaultSelectionQueryKey(),
        }),
      ]),
    onError: (error, _mode, context) => {
      queryClient.setQueryData(api.queryKey, context?.previous);
      try {
        const { code } = extractErrorData(error);
        showError(
          code === 'UNAUTHORIZED_ACCESS'
            ? t('models.modes.defaultForbidden')
            : t('models.modes.defaultSaveError'),
        );
      } catch {
        showError(t('models.modes.defaultSaveError'));
      }
    },
  });

  return {
    mode: data?.mode ?? null,
    currentPermittedModelId: data?.currentPermittedModelId ?? null,
    availableModes: data?.availableModes ?? [],
    isLoading,
    isSaving: mutation.isPending,
    setMode: (mode: ModelMode | null) => mutation.mutate(mode),
  };
}
