import {
  useThreadsControllerRemoveSource,
  type SourceResponseDto,
  getThreadsControllerGetThreadSourcesQueryKey,
  getThreadsControllerFindOneQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';

interface UseDeleteFileSourceProps {
  threadId?: string;
}

export function useDeleteFileSource({
  threadId,
}: UseDeleteFileSourceProps = {}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const router = useRouter();
  const deleteFileSourceMutation = useThreadsControllerRemoveSource({
    mutation: {
      onMutate: async ({ sourceId }) => {
        if (!threadId) {
          console.warn('Thread ID is required for optimistic update');
          return;
        }

        const queryKey = getThreadsControllerGetThreadSourcesQueryKey(threadId);

        await queryClient.cancelQueries({
          queryKey,
        });

        const previousData =
          queryClient.getQueryData<SourceResponseDto[]>(queryKey);

        // Optimistically update to remove the source
        queryClient.setQueryData<SourceResponseDto[]>(queryKey, (old) => {
          if (!old) {
            console.warn('No previous data found for optimistic update');
            return old;
          }

          return old.filter(
            (source: SourceResponseDto) => source.id !== sourceId,
          );
        });

        return { previousData, queryKey };
      },
      onError: (error, _, context) => {
        console.error('Error deleting file source', error);
        showError(t('chatInput.fileSourceDeleteError'));

        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
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
    console.log(
      'Deleting file source with sourceId:',
      sourceId,
      'from threadId:',
      threadId,
    );
    if (!threadId) {
      console.error('Thread ID is required');
      showError('Thread ID is required');
      return;
    }

    console.log(
      'Deleting file source with sourceId:',
      sourceId,
      'from threadId:',
      threadId,
    );
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
