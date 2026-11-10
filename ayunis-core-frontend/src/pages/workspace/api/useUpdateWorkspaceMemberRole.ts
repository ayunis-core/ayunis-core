import { useTranslation } from 'react-i18next';
import { useWorkspaceMembersControllerUpdateRole } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useInvalidateWorkspaceMembership } from '@/pages/workspace/api/useInvalidateWorkspaceMembership';
import type { WorkspaceRole } from '@/pages/workspace/model/workspace-members';

export function useUpdateWorkspaceMemberRole(workspaceId: string) {
  const { t } = useTranslation('workspace');
  const invalidateMembership = useInvalidateWorkspaceMembership(workspaceId);

  const mutation = useWorkspaceMembersControllerUpdateRole({
    mutation: {
      onSuccess: async () => {
        showSuccess(t('members.role.success'));
        await invalidateMembership();
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'WORKSPACE_LAST_ADMIN':
              showError(t('members.role.lastAdmin'));
              break;
            case 'WORKSPACE_MEMBER_NOT_FOUND':
              showError(t('members.role.notFound'));
              break;
            case 'UNAUTHORIZED_ACCESS':
              showError(t('members.role.notAllowed'));
              break;
            default:
              showError(t('members.role.error'));
          }
        } catch {
          showError(t('members.role.error'));
        }
      },
    },
  });

  function updateWorkspaceMemberRole(userId: string, role: WorkspaceRole) {
    mutation.mutate({ id: workspaceId, userId, data: { role } });
  }

  return { updateWorkspaceMemberRole, isUpdating: mutation.isPending };
}
