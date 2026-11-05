import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTeamMembersControllerRemoveTeamMember } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useInvalidateTeamMembership } from '@/pages/admin-settings/team-detail/api/useInvalidateTeamMembership';

export function useRemoveTeamMember(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const { confirm } = useConfirmation();
  const invalidateMembership = useInvalidateTeamMembership(teamId);
  const [removingUserIds, setRemovingUserIds] = useState<Set<string>>(
    new Set(),
  );

  const mutation = useTeamMembersControllerRemoveTeamMember({
    mutation: {
      onSuccess: async (_data, { userId }) => {
        showSuccess(t('teamDetail.removeMember.success'));
        await invalidateMembership(userId);
      },
      onError: (error) => {
        void invalidateMembership();
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'TEAM_MEMBER_NOT_FOUND':
              showError(t('teamDetail.removeMember.notFound'));
              break;
            case 'TEAM_LAST_ADMIN':
              showError(t('teamDetail.removeMember.lastAdmin'));
              break;
            default:
              showError(t('teamDetail.removeMember.error'));
          }
        } catch {
          showError(t('teamDetail.removeMember.error'));
        }
      },
      onSettled: (_data, _error, variables) => {
        setRemovingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.userId);
          return next;
        });
      },
    },
  });

  function removeTeamMember(userId: string) {
    confirm({
      title: t('teamDetail.removeMember.confirmTitle'),
      description: t('teamDetail.removeMember.confirmDescription'),
      confirmText: t('teamDetail.removeMember.confirmButton'),
      cancelText: t('teamDetail.removeMember.cancelButton'),
      variant: 'destructive',
      onConfirm: () => {
        setRemovingUserIds((prev) => new Set(prev).add(userId));
        mutation.mutate({ id: teamId, userId });
      },
    });
  }

  return {
    removeTeamMember,
    removingUserIds,
    isRemoving: mutation.isPending,
  };
}
