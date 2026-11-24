import {
  getMemoryControllerFindAllQueryKey,
  useMemoryControllerClear,
  useMemoryControllerDelete,
  useMemoryControllerFindAll,
  useMemoryControllerUpsert,
} from '@ayunis/api-client/endpoints';
import type {
  MemoryEntryResponseDto,
  MemoryResponseDto,
} from '@ayunis/api-client/schemas';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useTranslation } from 'react-i18next';

function replaceEntry(
  memory: MemoryResponseDto,
  saved: MemoryEntryResponseDto,
): MemoryResponseDto {
  return {
    entries: memory.entries.map((entry) =>
      entry.key === saved.key ? saved : entry,
    ),
  };
}

// Reserved keys stay listed without content, as the API returns them.
function removeEntries(
  memory: MemoryResponseDto,
  isRemoved: (key: string) => boolean,
): MemoryResponseDto {
  return {
    entries: memory.entries.flatMap((entry) => {
      if (!isRemoved(entry.key)) return [entry];
      return entry.isReserved
        ? [{ ...entry, content: '', description: null, updatedAt: null }]
        : [];
    }),
  };
}

export function useUserMemory() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const queryKey = getMemoryControllerFindAllQueryKey();
  const [clearCount, setClearCount] = useState(0);

  const { data, error, isLoading, refetch } = useMemoryControllerFindAll();

  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  // Applies a successful write right away, so the page does not depend on the
  // refetch that follows it.
  const updateMemory = (
    update: (memory: MemoryResponseDto) => MemoryResponseDto,
  ) =>
    queryClient.setQueryData<MemoryResponseDto>(
      queryKey,
      (memory) => memory && update(memory),
    );

  const upsertMutation = useMemoryControllerUpsert({
    mutation: {
      onSuccess: (saved) => {
        updateMemory((memory) => replaceEntry(memory, saved));
        showSuccess(t('memory.saved'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            code === 'MEMORY_ENTRY_LIMIT_REACHED'
              ? t('memory.limitReached')
              : t('memory.saveError'),
          );
        } catch {
          showError(t('memory.saveError'));
        }
      },
      onSettled: invalidate,
    },
  });

  const deleteMutation = useMemoryControllerDelete({
    mutation: {
      onSuccess: (_result, { key }) => {
        updateMemory((memory) => removeEntries(memory, (each) => each === key));
        showSuccess(t('memory.deleted'));
      },
      onError: () => showError(t('memory.deleteError')),
      onSettled: invalidate,
    },
  });

  const clearMutation = useMemoryControllerClear({
    mutation: {
      onSuccess: () => {
        updateMemory((memory) => removeEntries(memory, () => true));
        setClearCount((count) => count + 1);
        showSuccess(t('memory.cleared'));
      },
      onError: () => showError(t('memory.clearError')),
      onSettled: invalidate,
    },
  });

  // Rejects on failure, so the card can keep its draft open for a retry.
  // An omitted description keeps the stored one.
  function saveEntry(key: string, content: string, description?: string) {
    // The API rejects blank content: emptying an entry deletes it, which keeps
    // a reserved key listed and removes any other key.
    if (content.trim().length === 0) {
      return deleteMutation.mutateAsync({ key });
    }
    return upsertMutation.mutateAsync({
      key,
      data: {
        content: content.trim(),
        ...(description === undefined
          ? {}
          : { description: description.trim() }),
      },
    });
  }

  function deleteEntry(key: string) {
    deleteMutation.mutate({ key });
  }

  const isSaving = upsertMutation.isPending || deleteMutation.isPending;

  // A save that lands after the clear would bring its entry back.
  function clearMemory() {
    if (isSaving) return;
    clearMutation.mutate();
  }

  return {
    entries: data?.entries ?? [],
    isLoading,
    // A failed refetch keeps the loaded entries, so open drafts stay mounted.
    hasLoadFailed: data === undefined && error !== null,
    refetch,
    isSaving,
    isClearing: clearMutation.isPending,
    clearCount,
    saveEntry,
    deleteEntry,
    clearMemory,
  };
}
