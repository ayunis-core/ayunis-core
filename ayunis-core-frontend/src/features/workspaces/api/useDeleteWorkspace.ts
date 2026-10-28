import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  workspacesControllerRemove,
  getFavoritesControllerFindAllQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useDeleteWorkspace(onSuccess?: () => void) {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      await workspacesControllerRemove(workspaceId);
    },
    onSuccess: (_result, workspaceId) => {
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindAllQueryKey(),
      });
      // Invalidating the detail query would refetch a 404, so drop it instead.
      queryClient.removeQueries({
        queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
      });
      // The workspace's chats go with it, so the sidebar chat list is stale too.
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
      // The backend removes the workspace's favorites (and those of its chats).
      void queryClient.invalidateQueries({
        queryKey: getFavoritesControllerFindAllQueryKey(),
      });
      void router.invalidate();
      showSuccess(t('toast.deleteSuccess'));
      onSuccess?.();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'WORKSPACE_NOT_FOUND') {
          showError(t('toast.notFound'));
        } else {
          showError(t('toast.deleteError'));
        }
      } catch {
        showError(t('toast.deleteError'));
      }
    },
  });
}
