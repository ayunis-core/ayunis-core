import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  useTeamMembersControllerRemoveTeamMember,
  getTeamMembersControllerListTeamMembersQueryKey,
  getTeamsControllerGetTeamQueryKey,
  getTeamsControllerListTeamsQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

interface RemoveTeamMemberInput {
  userId: string;
  userName: string;
}

export function useRemoveTeamMember(teamId: string, teamName: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { confirm } = useConfirmation();
  const [removingUserIds, setRemovingUserIds] = useState<Set<string>>(
    new Set(),
  );

  const mutation = useTeamMembersControllerRemoveTeamMember({
    mutation: {
      onError: (error: unknown) => {
        const errorObj = error as { response?: { data?: { code?: string } } };
        const errorCode = errorObj.response?.data?.code;

        if (errorCode === 'TEAM_MEMBER_NOT_FOUND') {
          showError(t('teamDetail.removeMember.notFound'));
        } else if (errorCode === 'LAST_TEAM_ADMIN') {
          showError(t('teamDetail.removeMember.lastTeamAdmin'));
        } else {
          showError(t('teamDetail.removeMember.error'));
        }
      },
      onSettled: (_data, _error, variables) => {
        setRemovingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.userId);
          return next;
        });
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

  function removeTeamMember({ userId, userName }: RemoveTeamMemberInput) {
    confirm({
      title: t('teamDetail.removeMember.confirmTitle'),
      description: t('teamDetail.removeMember.confirmDescription'),
      confirmText: t('teamDetail.removeMember.confirmButton'),
      cancelText: t('teamDetail.removeMember.cancelButton'),
      variant: 'destructive',
      onConfirm: () => {
        setRemovingUserIds((prev) => new Set(prev).add(userId));
        mutation.mutate(
          { id: teamId, userId },
          {
            onSuccess: () =>
              showSuccess(
                t('teamDetail.removeMember.success', {
                  name: userName,
                  team: teamName,
                }),
              ),
          },
        );
      },
    });
  }

  return {
    removeTeamMember,
    removingUserIds,
    isRemoving: mutation.isPending,
  };
}
