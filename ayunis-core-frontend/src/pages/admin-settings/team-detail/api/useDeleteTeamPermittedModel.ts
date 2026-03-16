import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamPermittedModelsControllerDeleteTeamPermittedModel,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useDeleteTeamPermittedModel(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();

  const mutation = useTeamPermittedModelsControllerDeleteTeamPermittedModel({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teamDetail.models.disableSuccess'));
      },
      onError: () => {
        showError(t('teamDetail.models.disableError'));
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

  function deleteTeamPermittedModel(permittedModelId: string) {
    mutation.mutate({ teamId, id: permittedModelId });
  }

  return {
    deleteTeamPermittedModel,
    isDeleting: mutation.isPending,
  };
}
