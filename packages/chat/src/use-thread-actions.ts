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
import { apiErrorCode } from './api-error-code';
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

interface DeletionNotices {
  readonly onDeleted?: () => void;
  readonly onFailed: (error: unknown) => void;
}

function useThreadDeletion(
  config: Pick<ChatConfig, 'drafts' | 'events'>,
  lifecycle: ChatRunLifecycle,
  notices: DeletionNotices,
) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (threadId: string) =>
      threadsControllerDelete(threadId, lifecycle.getSessionSignal()),
    onSuccess: (_data, threadId) => {
      config.drafts?.write(threadId, '');
      notices.onDeleted?.();
      config.events.onThreadDeleted?.(threadId);
      // After the host left the chat, so an open conversation doesn't refetch it.
      queryClient.removeQueries({
        queryKey: getThreadsControllerFindOneQueryKey(threadId),
        exact: true,
      });
    },
    onError: notices.onFailed,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getFavoritesControllerFindAllQueryKey(),
      });
    },
  });
  const deleteThread = (threadId: string) => {
    // The run is aborted before the request, so no answer lands in a deleted chat.
    lifecycle.resetSubmission(threadId);
    lifecycle.abortActiveThreadRun(threadId);
    lifecycle.cancelDeferredThreadRun(threadId);
    mutation.mutate(threadId);
  };
  return {
    deleteThread,
    deletingId: mutation.isPending ? mutation.variables : undefined,
  };
}

/** Deletes the open chat from its header menu. */
export function useDeleteThread(
  config: Pick<ChatConfig, 'drafts' | 'events'>,
  lifecycle: ChatRunLifecycle,
) {
  const { t } = useTranslation('chat');
  return useThreadDeletion(config, lifecycle, {
    onFailed: (error) => {
      console.error('Failed to delete thread', error);
      showError(t('chat.errorDeleteThread'));
    },
  }).deleteThread;
}

/** Deletes a chat from the history and says whether that worked. */
export function useDeleteHistoryChat(
  config: Pick<ChatConfig, 'drafts' | 'events'>,
  lifecycle: ChatRunLifecycle,
) {
  const { t } = useTranslation('chats');
  return useThreadDeletion(config, lifecycle, {
    onDeleted: () => showSuccess(t('delete.success')),
    onFailed: (error) =>
      showError(
        apiErrorCode(error) === 'THREAD_NOT_FOUND'
          ? t('delete.notFound')
          : t('delete.error'),
      ),
  });
}
