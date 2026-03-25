import {
  useThreadSourcesControllerRemoveSource,
  getThreadsControllerFindOneQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseDeleteFileSourceProps {
  threadId?: string;
}

export function useDeleteFileSource({
  threadId,
}: UseDeleteFileSourceProps = {}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const router = useRouter();
  const deleteFileSourceMutation = useThreadSourcesControllerRemoveSource({
    mutation: {
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'SOURCE_NOT_FOUND') {
            showError(t('chatInput.sourceNotFound'));
          } else {
            showError(t('chatInput.fileSourceDeleteError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('chatInput.fileSourceDeleteError'));
        }
      },
      onSettled: () => {
        if (!threadId) return;
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
        void router.invalidate();
      },
    },
  });

  const deleteFileSource = (sourceId: string) => {
    if (!threadId) {
      showError('Thread ID is required');
      return;
    }

    deleteFileSourceMutation.mutate({
      id: threadId,
      sourceId,
    });
  };

  return {
    deleteFileSource,
    isLoading: deleteFileSourceMutation.isPending,
    isError: deleteFileSourceMutation.isError,
    error: deleteFileSourceMutation.error,
  };
}
