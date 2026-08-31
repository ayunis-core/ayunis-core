import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTeamPermittedModelsControllerDeleteTeamPermittedModel } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { invalidateTeamModelAccessQueries } from './invalidateTeamModelAccessQueries';

const ERROR_KEYS: Record<string, string> = {
  MODEL_NOT_FOUND: 'teamDetail.models.disableModelNotFound',
  MODEL_INVALID: 'teamDetail.models.disableModelInvalid',
};

export function useDeleteTeamPermittedModel(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();

  const mutation = useTeamPermittedModelsControllerDeleteTeamPermittedModel({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teamDetail.models.disableSuccess'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(t(ERROR_KEYS[code] ?? 'teamDetail.models.disableError'));
        } catch {
          showError(t('teamDetail.models.disableError'));
        }
      },
      onSettled: async () => {
        await invalidateTeamModelAccessQueries(queryClient, teamId);
      },
    },
  });

  function deleteTeamPermittedModel(permittedModelId: string) {
    mutation.mutate({ teamId, id: permittedModelId });
  }

  return {
    deleteTeamPermittedModel,
    isDeleting: mutation.isPending,
  };
}
