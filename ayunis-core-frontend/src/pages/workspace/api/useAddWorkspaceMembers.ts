import { useTranslation } from 'react-i18next';
import { useWorkspaceMembersControllerAdd } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showInfo, showSuccess } from '@/shared/lib/toast';
import { useInvalidateWorkspaceMembership } from '@/pages/workspace/api/useInvalidateWorkspaceMembership';
import type { WorkspaceRole } from '@/pages/workspace/model/workspace-members';

export function useAddWorkspaceMembers(
  workspaceId: string,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('workspace');
  const invalidateMembership = useInvalidateWorkspaceMembership(workspaceId);

  const mutation = useWorkspaceMembersControllerAdd({
    mutation: {
      onSuccess: (added) => {
        // Users who already are members are skipped, so a 2xx can add nobody.
        if (added.length === 0) {
          showInfo(t('members.add.noneAdded'));
          return;
        }
        showSuccess(t('members.add.success', { count: added.length }));
        onSuccess?.();
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'WORKSPACE_MEMBER_NOT_IN_ORG':
              showError(t('members.add.notInOrg'));
              break;
            case 'UNAUTHORIZED_ACCESS':
              showError(t('members.add.notAllowed'));
              break;
            default:
              showError(t('members.add.error'));
          }
        } catch {
          showError(t('members.add.error'));
        }
      },
      onSettled: () => invalidateMembership(),
    },
  });

  function addWorkspaceMembers(userIds: string[], role: WorkspaceRole) {
    mutation.mutate({ id: workspaceId, data: { userIds, role } });
  }

  return { addWorkspaceMembers, isAdding: mutation.isPending };
}
