import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  threadsControllerTogglePinned,
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export function useToggleThreadPinned() {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (threadId: string) =>
      await threadsControllerTogglePinned(threadId),
    onSuccess: (_data, threadId) => {
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(threadId),
      });
      void router.invalidate();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'THREAD_NOT_FOUND') {
          showError(t('toast.chatNotFound'));
        } else {
          showError(t('toast.pinError'));
        }
      } catch {
        showError(t('toast.pinError'));
      }
    },
  });
}
