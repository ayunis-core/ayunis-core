import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamsControllerDeleteTeam,
  getTeamsControllerListTeamsQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-teams');
  const { confirm } = useConfirmation();

  const mutation = useTeamsControllerDeleteTeam({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teams.deleteTeam.success'));
      },
      onError: (error: unknown) => {
        console.error('Delete team failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'TEAM_NOT_FOUND') {
            showError(t('teams.deleteTeam.notFound'));
          } else {
            showError(t('teams.deleteTeam.error'));
          }
        } catch {
          showError(t('teams.deleteTeam.error'));
        }
      },
      onSettled: () => {
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

  function deleteTeam(id: string) {
    confirm({
      title: t('teams.deleteTeam.title'),
      description: t('teams.deleteTeam.description'),
      confirmText: t('teams.deleteTeam.confirmText'),
      cancelText: t('teams.deleteTeam.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        mutation.mutate({ id });
      },
    });
  }

  return {
    deleteTeam,
    isDeleting: mutation.isPending,
  };
}
