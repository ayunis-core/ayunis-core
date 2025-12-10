import {
  usePromptsControllerDelete,
  getPromptsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeletePrompt() {
  const { t } = useTranslation('prompts');
  const queryClient = useQueryClient();

  return usePromptsControllerDelete({
    mutation: {
      onSuccess: () => {
        showSuccess(t('deleteSuccess'));
      },
      onError: (error) => {
        console.error('Delete prompt failed:', error);
        const { code } = extractErrorData(error);
        switch (code) {
          case 'PROMPT_NOT_FOUND':
            showError(t('notFound'));
            break;
          default:
            showError(t('deleteError'));
        }
      },
      onSettled: () => {
        // Invalidate and refetch prompts list
        void queryClient.invalidateQueries({
          queryKey: getPromptsControllerFindAllQueryKey(),
        });
      },
    },
  });
}
