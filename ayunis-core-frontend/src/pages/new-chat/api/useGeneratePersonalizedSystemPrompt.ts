import { useChatSettingsControllerGeneratePersonalizedSystemPrompt } from '@/shared/api/generated/ayunisCoreAPI';
import type {
  GeneratePersonalizedSystemPromptDto,
  GeneratePersonalizedSystemPromptResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

/**
 * Unlike other mutation hooks, this hook intentionally does NOT invalidate the
 * query cache on success. The caller needs to display a success screen with the
 * welcome message before the parent component re-renders — if we invalidated
 * here, the `useUserSystemPromptStatus` query would flip `hasSystemPrompt` to
 * true, causing `NewChatPage` to unmount the `PersonalizationCard` before the
 * user sees the welcome message (Bugbot unmount race). Cache invalidation is
 * deferred to the caller's `onComplete` callback instead.
 */
export function useGeneratePersonalizedSystemPrompt(options?: {
  onSuccess?: (data: GeneratePersonalizedSystemPromptResponseDto) => void;
  onError?: (error: unknown) => void;
}) {
  const { t } = useTranslation('chat');

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
