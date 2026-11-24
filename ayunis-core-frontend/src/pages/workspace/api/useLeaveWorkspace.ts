import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  getFavoritesControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  useWorkspaceMembersControllerLeave,
} from '@ayunis/api-client/endpoints';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useLeaveWorkspace(workspaceId: string) {
  const { t } = useTranslation('workspace');
  const { confirm } = useConfirmation();
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useWorkspaceMembersControllerLeave({
    mutation: {
      onSuccess: async () => {
        // Refetching the workspace would only return 404 now.
        queryClient.removeQueries({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
        });
        // The workspace and its chats drop out of the lists, picker and
        // favorites.
        await Promise.all(
          [
            getWorkspacesControllerFindAllQueryKey(),
            getThreadsControllerFindAllQueryKey(),
            getFavoritesControllerFindAllQueryKey(),
          ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
        showSuccess(t('members.leave.success'));
        await router.navigate({ to: '/workspaces' });
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'WORKSPACE_LAST_ADMIN':
              showError(t('members.leave.lastAdmin'));
              break;
            case 'WORKSPACE_NOT_FOUND':
              showError(t('members.leave.notFound'));
              break;
            default:
              showError(t('members.leave.error'));
          }
        } catch {
          showError(t('members.leave.error'));
        }
      },
    },
  });

  function leaveWorkspace(workspaceName: string) {
    confirm({
      title: t('members.leave.confirmTitle'),
      description: t('members.leave.confirmDescription', {
        name: workspaceName,
      }),
      confirmText: t('members.leave.confirmButton'),
      cancelText: t('members.leave.cancelButton'),
      variant: 'destructive',
      onConfirm: () => mutation.mutate({ id: workspaceId }),
    });
  }

  return { leaveWorkspace, isLeaving: mutation.isPending };
}
