import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamsControllerUpdateTeam,
  getTeamsControllerListTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateTeamFormData } from '../model/types';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';

export function useUpdateTeam(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-teams');

  const mutation = useTeamsControllerUpdateTeam({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teams.updateTeam.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Update team failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'TEAM_NAME_ALREADY_EXISTS':
              showError(t('teams.updateTeam.duplicateName'));
              break;
            case 'TEAM_NOT_FOUND':
              showError(t('teams.updateTeam.notFound'));
              break;
            default:
              showError(t('teams.updateTeam.error'));
          }
        } catch {
          showError(t('teams.updateTeam.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListTeamsQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  function updateTeam(id: string, data: UpdateTeamFormData) {
    mutation.mutate({ id, data: { name: data.name.trim() } });
  }

  return {
    updateTeam,
    isUpdating: mutation.isPending,
  };
}
