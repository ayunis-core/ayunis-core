import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  workspacesControllerReorder,
  getWorkspacesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export function useReorderWorkspaces() {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (workspaceIds: string[]) =>
      await workspacesControllerReorder({ workspaceIds }),
    onSuccess: () => {
      void router.invalidate();
    },
    onError: (error) => {
      // Any failure here means the order the user just dragged did not stick;
      // the invalidate in onSettled puts the list back to the server's order.
      try {
        const { code } = extractErrorData(error);
        if (code === 'WORKSPACE_NOT_FOUND') {
          showError(t('toast.notFound'));
        } else {
          showError(t('toast.reorderError'));
        }
      } catch {
        showError(t('toast.reorderError'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindAllQueryKey(),
      });
    },
  });
}
