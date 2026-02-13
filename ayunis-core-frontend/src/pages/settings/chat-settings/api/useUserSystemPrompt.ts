import {
  useChatSettingsControllerGetSystemPrompt,
  useChatSettingsControllerUpsertSystemPrompt,
  useChatSettingsControllerDeleteSystemPrompt,
  getChatSettingsControllerGetSystemPromptQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpsertUserSystemPromptDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useUserSystemPrompt() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = getChatSettingsControllerGetSystemPromptQueryKey();

  const {
    data: userSystemPromptResponse,
    error,
    isLoading,
  } = useChatSettingsControllerGetSystemPrompt();

  const upsertMutation = useChatSettingsControllerUpsertSystemPrompt({
    mutation: {
      onSuccess: () => {
        showSuccess(t('chat.systemPromptSaved'));
      },
      onError: () => {
        showError(t('chat.systemPromptError'));
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await router.invalidate();
      },
    },
  });

  const deleteMutation = useChatSettingsControllerDeleteSystemPrompt({
    mutation: {
      onSuccess: () => {
        showSuccess(t('chat.systemPromptDeleted'));
      },
      onError: () => {
        showError(t('chat.systemPromptError'));
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await router.invalidate();
      },
    },
  });

  function upsertSystemPrompt(systemPrompt: string) {
    const data: UpsertUserSystemPromptDto = { systemPrompt };
    return upsertMutation.mutate({ data });
  }

  function deleteSystemPrompt() {
    return deleteMutation.mutate();
  }

  return {
    systemPrompt: userSystemPromptResponse?.systemPrompt ?? null,
    isLoading,
    error,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
    upsertSystemPrompt,
    deleteSystemPrompt,
  };
}
