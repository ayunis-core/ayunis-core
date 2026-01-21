import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamsControllerCreateTeam,
  getTeamsControllerListTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateTeamFormData } from '../model/types';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useCreateTeam(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-teams');

  const mutation = useTeamsControllerCreateTeam({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getTeamsControllerListTeamsQueryKey(),
        });
        showSuccess(t('teams.createTeam.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Create team failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'TEAM_NAME_ALREADY_EXISTS':
              showError(t('teams.createTeam.duplicateName'));
              break;
            default:
              showError(t('teams.createTeam.error'));
          }
        } catch {
          showError(t('teams.createTeam.error'));
        }
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
