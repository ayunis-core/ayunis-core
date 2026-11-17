import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useWorkspaceMembersControllerRemove } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useInvalidateWorkspaceMembership } from '@/pages/workspace/api/useInvalidateWorkspaceMembership';
import type { WorkspaceMember } from '@/pages/workspace/model/workspace-members';

export function useRemoveWorkspaceMember(workspaceId: string) {
  const { t } = useTranslation('workspace');
  const { confirm } = useConfirmation();
  const invalidateMembership = useInvalidateWorkspaceMembership(workspaceId);
  const [removingUserIds, setRemovingUserIds] = useState<Set<string>>(
    new Set(),
  );

  const mutation = useWorkspaceMembersControllerRemove({
    mutation: {
      onSuccess: async () => {
        showSuccess(t('members.remove.success'));
        await invalidateMembership();
      },
      onError: (error) => {
        void invalidateMembership();
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'WORKSPACE_LAST_ADMIN':
              showError(t('members.remove.lastAdmin'));
              break;
            case 'WORKSPACE_MEMBER_NOT_FOUND':
              showError(t('members.remove.notFound'));
              break;
            case 'UNAUTHORIZED_ACCESS':
              showError(t('members.remove.notAllowed'));
              break;
            default:
              showError(t('members.remove.error'));
          }
        } catch {
          showError(t('members.remove.error'));
        }
      },
      onSettled: (_data, _error, { userId }) => {
        setRemovingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      },
    },
  });

  function removeWorkspaceMember(member: WorkspaceMember) {
    confirm({
      title: t('members.remove.confirmTitle'),
      description: t('members.remove.confirmDescription', {
        name: member.name,
      }),
      confirmText: t('members.remove.confirmButton'),
      cancelText: t('members.remove.cancelButton'),
      variant: 'destructive',
      onConfirm: () => {
        setRemovingUserIds((prev) => new Set(prev).add(member.userId));
        mutation.mutate({ id: workspaceId, userId: member.userId });
      },
    });
  }

  return { removeWorkspaceMember, removingUserIds };
}
