import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useThreadsControllerDelete,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useTranslation } from 'react-i18next';

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
      onError: () => {
        showError(t('delete.error'));
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
