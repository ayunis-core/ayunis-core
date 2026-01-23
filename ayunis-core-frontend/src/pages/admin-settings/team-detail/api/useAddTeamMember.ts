import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  useTeamsControllerAddTeamMember,
  getTeamsControllerListTeamMembersQueryKey,
  getTeamsControllerGetTeamQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useAddTeamMember(teamId: string, onSuccess?: () => void) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useTeamsControllerAddTeamMember({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teamDetail.addMember.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        const errorObj = error as { response?: { data?: { code?: string } } };
        const errorCode = errorObj?.response?.data?.code;

        if (errorCode === 'USER_ALREADY_TEAM_MEMBER') {
          showError(t('teamDetail.addMember.alreadyMember'));
        } else if (errorCode === 'USER_NOT_IN_SAME_ORG') {
          showError(t('teamDetail.addMember.notInSameOrg'));
        } else if (errorCode === 'USER_NOT_FOUND') {
          showError(t('teamDetail.addMember.userNotFound'));
        } else {
          showError(t('teamDetail.addMember.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListTeamMembersQueryKey(teamId),
        });
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerGetTeamQueryKey(teamId),
        });
        void router.invalidate();
      },
    },
  });

  function addTeamMember(userId: string) {
    mutation.mutate({ id: teamId, data: { userId } });
  }

  return {
    addTeamMember,
    isAdding: mutation.isPending,
  };
}
