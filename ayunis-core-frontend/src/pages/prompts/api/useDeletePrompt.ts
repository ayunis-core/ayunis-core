import {
  usePromptsControllerDelete,
  getPromptsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeletePrompt() {
  const { t } = useTranslation('prompts');
  const queryClient = useQueryClient();
  const router = useRouter();

  return usePromptsControllerDelete({
    mutation: {
      onSuccess: () => {
        showSuccess(t('deleteSuccess'));
      },
      onError: (error) => {
        console.error('Delete prompt failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'PROMPT_NOT_FOUND':
              showError(t('notFound'));
              break;
            default:
              showError(t('deleteError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('deleteError'));
        }
      },
      onSettled: () => {
        // Invalidate and refetch prompts list
        void queryClient.invalidateQueries({
          queryKey: getPromptsControllerFindAllQueryKey(),
        });
        void router.invalidate();
      },
    },
  });
}
