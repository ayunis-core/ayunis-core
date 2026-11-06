import { useTranslation } from 'react-i18next';
import { useTeamMembersControllerUpdateTeamMemberRole } from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateTeamMemberRoleDtoRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useInvalidateTeamMembership } from '@/pages/admin-settings/team-detail/api/useInvalidateTeamMembership';

export function useUpdateTeamMemberRole(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const invalidateMembership = useInvalidateTeamMembership(teamId);

  const mutation = useTeamMembersControllerUpdateTeamMemberRole({
    mutation: {
      onSuccess: async (_member, { userId }) => {
        showSuccess(t('teamDetail.memberRole.success'));
        await invalidateMembership(userId);
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'TEAM_LAST_ADMIN':
              showError(t('teamDetail.memberRole.lastAdmin'));
              break;
            case 'TEAM_MEMBER_NOT_FOUND':
              showError(t('teamDetail.memberRole.notFound'));
              break;
            default:
              showError(t('teamDetail.memberRole.error'));
          }
        } catch {
          showError(t('teamDetail.memberRole.error'));
        }
      },
    },
  });

  function updateTeamMemberRole(
    userId: string,
    role: UpdateTeamMemberRoleDtoRole,
  ) {
    mutation.mutate({ id: teamId, userId, data: { role } });
  }

  return {
    updateTeamMemberRole,
    isUpdating: mutation.isPending,
  };
}
