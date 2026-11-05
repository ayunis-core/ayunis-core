import {
  getMemoryControllerFindAllQueryKey,
  useMemoryControllerClear,
  useMemoryControllerDelete,
  useMemoryControllerFindAll,
  useMemoryControllerUpsert,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useUserMemory() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const queryKey = getMemoryControllerFindAllQueryKey();

  const { data, error, isLoading, refetch } = useMemoryControllerFindAll();

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const upsertMutation = useMemoryControllerUpsert({
    mutation: {
      onSuccess: () => showSuccess(t('memory.saved')),
      onError: () => showError(t('memory.saveError')),
      onSettled: invalidate,
    },
  });

  const deleteMutation = useMemoryControllerDelete({
    mutation: {
      onSuccess: () => showSuccess(t('memory.deleted')),
      onError: () => showError(t('memory.deleteError')),
      onSettled: invalidate,
    },
  });

  const clearMutation = useMemoryControllerClear({
    mutation: {
      onSuccess: () => showSuccess(t('memory.cleared')),
      onError: () => showError(t('memory.deleteError')),
      onSettled: invalidate,
    },
  });

  function saveEntry(key: string, content: string) {
    // An emptied entry is a deletion, matching what set_memory does for the
    // assistant: a reserved key stays listed, an open key disappears.
    if (content.trim().length === 0) {
      return deleteMutation.mutate({ key });
    }
    return upsertMutation.mutate({ key, data: { content: content.trim() } });
  }

  function deleteEntry(key: string) {
    return deleteMutation.mutate({ key });
  }

  function clearMemory() {
    return clearMutation.mutate();
  }

  return {
    entries: data?.entries ?? [],
    isLoading,
    error,
    refetch,
    isSaving: upsertMutation.isPending || deleteMutation.isPending,
    isClearing: clearMutation.isPending,
    saveEntry,
    deleteEntry,
    clearMemory,
  };
}
