import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamPermittedModelsControllerUpdateTeamPermittedModel,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { PermittedLanguageModelResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';

interface UpdateTeamPermittedModelParams {
  permittedModelId: string;
  anonymousOnly: boolean;
}

export function useUpdateTeamPermittedModel(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();
  const listQueryKey =
    getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey(teamId);

  const mutation = useTeamPermittedModelsControllerUpdateTeamPermittedModel({
    mutation: {
      onMutate: async ({ id, data }) => {
        await queryClient.cancelQueries({ queryKey: listQueryKey });
        const previous =
          queryClient.getQueryData<PermittedLanguageModelResponseDto[]>(
            listQueryKey,
          );
        queryClient.setQueryData<PermittedLanguageModelResponseDto[]>(
          listQueryKey,
          (models) =>
            models?.map((model) =>
              model.id === id
                ? { ...model, anonymousOnly: data.anonymousOnly }
                : model,
            ),
        );
        return { previous };
      },
      onError: (_error, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(listQueryKey, context.previous);
        }
        showError(t('teamDetail.models.updateError'));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: listQueryKey });
      },
    },
  });

  function updateTeamPermittedModel(params: UpdateTeamPermittedModelParams) {
    mutation.mutate({
      teamId,
      id: params.permittedModelId,
      data: { anonymousOnly: params.anonymousOnly },
    });
  }

  return {
    updateTeamPermittedModel,
    isUpdating: mutation.isPending,
  };
}
