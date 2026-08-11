import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  workspacesControllerTogglePinned,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export function useToggleWorkspacePinned() {
  const { t } = useTranslation('workspaces');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (workspaceId: string) =>
      await workspacesControllerTogglePinned(workspaceId),
    onSuccess: (_data, workspaceId) => {
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
      });
      void router.invalidate();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'WORKSPACE_NOT_FOUND') {
          showError(t('toast.notFound'));
        } else {
          showError(t('toast.pinError'));
        }
      } catch {
        showError(t('toast.pinError'));
      }
    },
  });
}
