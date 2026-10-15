import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  useTeamMembersControllerUpdateTeamMember,
  getTeamMembersControllerListTeamMembersQueryKey,
  getTeamsControllerGetTeamQueryKey,
  getTeamsControllerListTeamsQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

interface SetTeamAdminInput {
  userId: string;
  userName: string;
  isTeamAdmin: boolean;
}

export function useSetTeamAdmin(teamId: string, teamName: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useTeamMembersControllerUpdateTeamMember({
    mutation: {
      onError: (error: unknown) => {
        const { code } = extractErrorData(error);
        if (code === 'LAST_TEAM_ADMIN') {
          showError(t('teamDetail.setTeamAdmin.lastTeamAdmin'));
        } else if (code === 'TEAM_MEMBER_NOT_FOUND') {
          showError(t('teamDetail.setTeamAdmin.notFound'));
        } else {
          showError(t('teamDetail.setTeamAdmin.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getTeamMembersControllerListTeamMembersQueryKey(teamId),
        });
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerGetTeamQueryKey(teamId),
        });
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListTeamsQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListMyTeamsQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  function setTeamAdmin({ userId, userName, isTeamAdmin }: SetTeamAdminInput) {
    mutation.mutate(
      { id: teamId, userId, data: { isTeamAdmin } },
      {
        onSuccess: () =>
          showSuccess(
            t(
              isTeamAdmin
                ? 'teamDetail.setTeamAdmin.promoted'
                : 'teamDetail.setTeamAdmin.demoted',
              { name: userName, team: teamName },
            ),
          ),
      },
    );
  }

  return { setTeamAdmin, isSettingTeamAdmin: mutation.isPending };
}
