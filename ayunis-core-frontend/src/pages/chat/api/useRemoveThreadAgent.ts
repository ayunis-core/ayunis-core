import {
  getThreadsControllerFindOneQueryKey,
  useThreadsControllerRemoveAgent,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function useRemoveThreadAgent({ threadId }: { threadId: string }) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useThreadsControllerRemoveAgent({
    mutation: {
      onError: () => {
        showError(t('chat.errorRemoveAgent'));
      },
      onSettled: (_, __, { id: threadId }) => {
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
        void router.invalidate();
      },
    },
  });

  function removeAgent(): void {
    mutation.mutate({ id: threadId });
  }

  return {
    removeAgent,
    isRemoving: mutation.isPending,
    error: mutation.error,
  };
}
