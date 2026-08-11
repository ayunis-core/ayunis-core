import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  workspacesControllerRemove,
  getWorkspacesControllerFindAllQueryKey,
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
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindAllQueryKey(),
      });
      // The workspace's chats go with it, so the sidebar chat list is stale too.
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
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
