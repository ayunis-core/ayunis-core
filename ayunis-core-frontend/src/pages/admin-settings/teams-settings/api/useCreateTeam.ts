import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamsControllerCreateTeam,
  getTeamsControllerListTeamsQueryKey,
  getTeamsControllerListMyTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateTeamFormData } from '../model/types';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';

export function useCreateTeam(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-teams');

  const mutation = useTeamsControllerCreateTeam({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teams.createTeam.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Create team failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'TEAM_NAME_ALREADY_EXISTS') {
            showError(t('teams.createTeam.duplicateName'));
          } else {
            showError(t('teams.createTeam.error'));
          }
        } catch {
          showError(t('teams.createTeam.error'));
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

  function createTeam(data: CreateTeamFormData) {
    mutation.mutate({ data: { name: data.name.trim() } });
  }

  return {
    createTeam,
    isCreating: mutation.isPending,
  };
}
