import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  useTeamsControllerBulkAddTeamMembers,
  getTeamsControllerListTeamMembersQueryKey,
  getTeamsControllerGetTeamQueryKey,
  getTeamsControllerListTeamsQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showInfo, showSuccess } from '@/shared/lib/toast';

export function useAddTeamMembers(teamId: string, onSuccess?: () => void) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useTeamsControllerBulkAddTeamMembers({
    mutation: {
      onSuccess: (added) => {
        // The API skips users that are already members / not in the org, so a
        // 2xx can still add nobody — don't claim success in that case.
        if (added.length === 0) {
          showInfo(t('teamDetail.addMember.noneAdded'));
          return;
        }
        showSuccess(t('teamDetail.addMember.success', { count: added.length }));
        onSuccess?.();
      },
      onError: () => {
        showError(t('teamDetail.addMember.error'));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListTeamMembersQueryKey(teamId),
        });
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerGetTeamQueryKey(teamId),
        });
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListTeamsQueryKey(),
        });
        // Invalidate my teams cache since membership changes affect shares tab
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListMyTeamsQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  function addTeamMembers(userIds: string[]) {
    mutation.mutate({ id: teamId, data: { userIds } });
  }

  return {
    addTeamMembers,
    isAdding: mutation.isPending,
  };
}
