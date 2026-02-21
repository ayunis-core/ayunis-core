import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  useTeamsControllerRemoveTeamMember,
  getTeamsControllerListTeamMembersQueryKey,
  getTeamsControllerGetTeamQueryKey,
  getAgentsControllerFindAllQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRemoveTeamMember(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { confirm } = useConfirmation();
  const [removingUserIds, setRemovingUserIds] = useState<Set<string>>(
    new Set(),
  );

  const mutation = useTeamsControllerRemoveTeamMember({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teamDetail.removeMember.success'));
      },
      onError: (error: unknown) => {
        const errorObj = error as { response?: { data?: { code?: string } } };
        const errorCode = errorObj.response?.data?.code;

        if (errorCode === 'TEAM_MEMBER_NOT_FOUND') {
          showError(t('teamDetail.removeMember.notFound'));
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
          queryKey: getTeamsControllerListTeamMembersQueryKey(teamId),
        });
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerGetTeamQueryKey(teamId),
        });
        // Invalidate agents cache since team membership affects access to shared agents
        void queryClient.invalidateQueries({
          queryKey: getAgentsControllerFindAllQueryKey(),
        });
        // Invalidate my teams cache since membership changes affect shares tab
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListMyTeamsQueryKey(),
        });
        void router.invalidate();
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
