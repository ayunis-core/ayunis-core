import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamPermittedModelsControllerCreateTeamPermittedModel,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useCreateTeamPermittedModel(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();

  const mutation = useTeamPermittedModelsControllerCreateTeamPermittedModel({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teamDetail.models.enableSuccess'));
      },
      onError: (error: unknown) => {
        const errorObj = error as { response?: { data?: { code?: string } } };
        const errorCode = errorObj.response?.data?.code;

        if (errorCode === 'DUPLICATE_TEAM_PERMITTED_MODEL') {
          showError(t('teamDetail.models.enableAlreadyEnabled'));
        } else if (errorCode === 'MODEL_NOT_FOUND') {
          showError(t('teamDetail.models.enableModelNotFound'));
        } else if (errorCode === 'MODEL_INVALID') {
          showError(t('teamDetail.models.enableModelInvalid'));
        } else {
          showError(t('teamDetail.models.enableError'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey(
              teamId,
            ),
        });
      },
    },
  });

  function createTeamPermittedModel(modelId: string) {
    mutation.mutate({ teamId, data: { modelId } });
  }

  return {
    createTeamPermittedModel,
    isCreating: mutation.isPending,
  };
}
