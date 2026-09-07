import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
  useTeamPermittedModelsControllerUpdateTeamPermittedModel,
  type PermittedLanguageModelResponseDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { invalidateTeamModelAccessQueries } from './invalidateTeamModelAccessQueries';

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
      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(listQueryKey, context.previous);
        }
        try {
          const { code } = extractErrorData(error);
          const errorKey =
            code === 'MODEL_NOT_FOUND'
              ? 'teamDetail.models.updateModelNotFound'
              : 'teamDetail.models.updateError';
          showError(t(errorKey));
        } catch {
          showError(t('teamDetail.models.updateError'));
        }
      },
      onSettled: async () => {
        await invalidateTeamModelAccessQueries(queryClient, teamId);
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
