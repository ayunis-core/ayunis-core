import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamPermittedModelsControllerSetTeamDefaultModel,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useSetTeamDefaultModel(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();

  const mutation = useTeamPermittedModelsControllerSetTeamDefaultModel({
    mutation: {
      onSuccess: () => {
        showSuccess(t('models.defaultModel.success'));
      },
      onError: () => {
        showError(t('models.defaultModel.error'));
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

  function setTeamDefaultModel(permittedModelId: string) {
    mutation.mutate({ teamId, data: { permittedModelId } });
  }

  return {
    setTeamDefaultModel,
    isSetting: mutation.isPending,
  };
}
