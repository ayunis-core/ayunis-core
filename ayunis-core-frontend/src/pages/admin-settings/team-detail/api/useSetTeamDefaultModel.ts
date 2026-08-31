import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTeamPermittedModelsControllerSetTeamDefaultModel } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { invalidateTeamModelAccessQueries } from './invalidateTeamModelAccessQueries';

const ERROR_KEYS: Record<string, string> = {
  MODEL_NOT_FOUND: 'models.defaultModel.modelNotFound',
  MODEL_INVALID: 'models.defaultModel.modelInvalid',
};

export function useSetTeamDefaultModel(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();

  const mutation = useTeamPermittedModelsControllerSetTeamDefaultModel({
    mutation: {
      onSuccess: () => {
        showSuccess(t('models.defaultModel.success'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(t(ERROR_KEYS[code] ?? 'models.defaultModel.error'));
        } catch {
          showError(t('models.defaultModel.error'));
        }
      },
      onSettled: async () => {
        await invalidateTeamModelAccessQueries(queryClient, teamId);
      },
    },
  });

  function setTeamDefaultModel(permittedModelId: string) {
    mutation.mutate({ teamId, data: { permittedModelId } });
  }

  return {
    setTeamDefaultModel,
    isSetting: mutation.isPending,
  };
}
