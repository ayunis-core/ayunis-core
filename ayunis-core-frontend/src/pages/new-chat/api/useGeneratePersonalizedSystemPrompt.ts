import {
  useChatSettingsControllerGeneratePersonalizedSystemPrompt,
  getChatSettingsControllerGetSystemPromptQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  GeneratePersonalizedSystemPromptDto,
  GeneratePersonalizedSystemPromptResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

export function useGeneratePersonalizedSystemPrompt(options?: {
  onSuccess?: (data: GeneratePersonalizedSystemPromptResponseDto) => void;
  onError?: (error: unknown) => void;
}) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = getChatSettingsControllerGetSystemPromptQueryKey();

  const mutation = useChatSettingsControllerGeneratePersonalizedSystemPrompt({
    mutation: {
      onSuccess: (data) => {
        showSuccess(t('newChat.personalizedPromptSuccess'));
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        let message = t('newChat.personalizedPromptError');
        try {
          const errorData = extractErrorData(error);
          if (errorData.status === 422) {
            message = t('newChat.noDefaultModelError');
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
        }
        showError(message);
        options?.onError?.(error);
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await router.invalidate();
      },
    },
  });

  function generate(answers: GeneratePersonalizedSystemPromptDto) {
    mutation.mutate({ data: answers });
  }

  return {
    generate,
    isGenerating: mutation.isPending,
    error: mutation.error,
    result: mutation.data ?? null,
  };
}
