import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useThreadsControllerDelete,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteChat(onSuccess?: () => void) {
  const { t } = useTranslation('chats');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useThreadsControllerDelete({
    mutation: {
      onSuccess: () => {
        showSuccess(t('delete.success'));
        onSuccess?.();
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'THREAD_NOT_FOUND') {
            showError(t('delete.notFound'));
          } else {
            showError(t('delete.error'));
          }
        } catch {
          showError(t('delete.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindAllQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  function deleteChat(chatId: string) {
    mutation.mutate({ id: chatId });
  }

  return {
    deleteChat,
    isDeleting: mutation.isPending,
  };
}
