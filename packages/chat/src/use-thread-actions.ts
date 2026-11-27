import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getFavoritesControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerDelete,
  threadsControllerUpdateTitle,
} from '@ayunis/api-client/endpoints';
import type { ChatConfig } from './chat-config';
import type { ChatRunLifecycle } from './run-lifecycle';
import { showError, showSuccess } from './chat-toasts';

export function useRenameThread(
  lifecycle: ChatRunLifecycle,
  onRenamed: () => void,
) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, title }: { threadId: string; title: string }) =>
      threadsControllerUpdateTitle(
        threadId,
        { title },
        lifecycle.getSessionSignal(),
      ),
    onSuccess: (_data, { threadId }) => {
      for (const queryKey of [
        getThreadsControllerFindAllQueryKey(),
        getThreadsControllerFindOneQueryKey(threadId),
        getFavoritesControllerFindAllQueryKey(),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      showSuccess(t('sidebar.renameThreadSuccess'));
      onRenamed();
    },
    onError: () => showError(t('sidebar.renameThreadError')),
  });
}

export function useDeleteThread(
  config: Pick<ChatConfig, 'drafts' | 'events'>,
  lifecycle: ChatRunLifecycle,
) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (threadId: string) =>
      threadsControllerDelete(threadId, lifecycle.getSessionSignal()),
    onSuccess: (_data, threadId) => {
      config.drafts?.write(threadId, '');
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getFavoritesControllerFindAllQueryKey(),
      });
      config.events.onThreadDeleted?.(threadId);
    },
    onError: (error) => {
      console.error('Failed to delete thread', error);
      showError(t('chat.errorDeleteThread'));
    },
  });
  return (threadId: string) => {
    // The run is aborted before the request, so no answer lands in a deleted chat.
    lifecycle.resetSubmission(threadId);
    lifecycle.abortActiveThreadRun(threadId);
    lifecycle.cancelDeferredThreadRun(threadId);
    mutation.mutate(threadId);
  };
}
