import {
  useOrgSystemPromptControllerGetOrgSystemPrompt,
  useOrgSystemPromptControllerUpsertOrgSystemPrompt,
  useOrgSystemPromptControllerDeleteOrgSystemPrompt,
  getOrgSystemPromptControllerGetOrgSystemPromptQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpsertOrgSystemPromptDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useOrgSystemPrompt() {
  const { t } = useTranslation('admin-settings-instructions');
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = getOrgSystemPromptControllerGetOrgSystemPromptQueryKey();

  const {
    data: orgSystemPromptResponse,
    error,
    isError,
    isLoading,
    refetch,
  } = useOrgSystemPromptControllerGetOrgSystemPrompt();

  const upsertMutation = useOrgSystemPromptControllerUpsertOrgSystemPrompt({
    mutation: {
      onSuccess: () => {
        showSuccess(t('instructions.saved'));
      },
      onError: () => {
        showError(t('instructions.error'));
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await router.invalidate();
      },
    },
  });

  const deleteMutation = useOrgSystemPromptControllerDeleteOrgSystemPrompt({
    mutation: {
      onSuccess: () => {
        showSuccess(t('instructions.deleted'));
      },
      onError: () => {
        showError(t('instructions.error'));
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await router.invalidate();
      },
    },
  });

  function upsertSystemPrompt(systemPrompt: string) {
    const data: UpsertOrgSystemPromptDto = { systemPrompt };
    return upsertMutation.mutate({ data });
  }

  function deleteSystemPrompt() {
    return deleteMutation.mutate();
  }

  return {
    systemPrompt: orgSystemPromptResponse?.systemPrompt ?? null,
    isLoading,
    isError,
    error,
    refetch,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
    upsertSystemPrompt,
    deleteSystemPrompt,
  };
}
