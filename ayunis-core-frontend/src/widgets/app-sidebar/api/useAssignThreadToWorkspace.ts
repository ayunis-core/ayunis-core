import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  threadsControllerAssignWorkspace,
  getFavoritesControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  getWorkspacesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

interface AssignThreadToWorkspaceParams {
  threadId: string;
  /** `null` removes the chat from its workspace. */
  workspaceId: string | null;
}

export function useAssignThreadToWorkspace() {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      threadId,
      workspaceId,
    }: AssignThreadToWorkspaceParams) => {
      await threadsControllerAssignWorkspace(threadId, { workspaceId });
    },
    onSuccess: (_data, { threadId, workspaceId }) => {
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
      // The open chat route loads through findOne; without this the thread
      // keeps its old workspaceId until the cache expires.
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(threadId),
      });
      // Workspace cards derive chatCount/lastActivityAt from the list query.
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getFavoritesControllerFindAllQueryKey(),
      });
      void router.invalidate();
      showSuccess(
        workspaceId === null ? t('toast.chatRemoved') : t('toast.chatMoved'),
      );
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'WORKSPACE_NOT_FOUND') {
          showError(t('toast.notFound'));
        } else if (code === 'THREAD_NOT_FOUND') {
          showError(t('toast.chatNotFound'));
        } else {
          showError(t('toast.chatMoveError'));
        }
      } catch {
        showError(t('toast.chatMoveError'));
      }
    },
  });
}
