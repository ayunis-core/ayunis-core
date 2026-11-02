import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getModelModesControllerGetModelModesQueryKey,
  getSuperAdminModelModesControllerGetEntriesQueryKey,
  superAdminModelModesControllerReplaceEntries,
  superAdminModelModesControllerGetEntries,
  type ModelMode,
  type ModelModeEntryDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

/** A mode's ordered model list; every change replaces the whole list. */
export function useModelModeEntries(mode: ModelMode) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const queryKey = getSuperAdminModelModesControllerGetEntriesQueryKey(mode);
  const { data } = useQuery({
    queryKey,
    queryFn: () => superAdminModelModesControllerGetEntries(mode),
  });

  const mutationKey = ['replace-model-mode-entries', mode];

  const mutation = useMutation({
    mutationKey,
    // Each save sends the full list; run them in order so an earlier, slower
    // request cannot overwrite a later edit.
    scope: { id: `replace-model-mode-entries:${mode}` },
    mutationFn: (entries: ModelModeEntryDto[]) =>
      superAdminModelModesControllerReplaceEntries(mode, { entries }),
    onMutate: async (entries) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ModelModeEntryDto[]>(queryKey);
      queryClient.setQueryData(queryKey, entries);
      return { previous };
    },
    onError: (error, _entries, context) => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.setQueryData(queryKey, context?.previous);
      }
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'MODEL_TIER_NOT_ALLOWED_FOR_MODE':
            showError(t('models.modes.tierNotAllowed'));
            break;
          case 'MODEL_NOT_FOUND':
            showError(t('models.modes.modelNotFound'));
            break;
          default:
            showError(t('models.modes.saveError'));
        }
      } catch {
        showError(t('models.modes.saveError'));
      }
    },
    onSettled: () => {
      // A refetch while later saves are queued would drop their edits.
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: getModelModesControllerGetModelModesQueryKey(),
      });
    },
  });

  return {
    entries: data ?? [],
    isLoaded: data !== undefined,
    // Every save replaces the stored list, so one built on the empty
    // placeholder would wipe it.
    replaceEntries: (entries: ModelModeEntryDto[]) => {
      if (data !== undefined) mutation.mutate(entries);
    },
  };
}
