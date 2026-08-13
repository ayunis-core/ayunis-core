import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useTeamPermittedModelsControllerUpdateTeamPermittedModel,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  PermittedLanguageModelResponseDto,
  UpdatePermittedModelDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

interface UpdateTeamPermittedModelParams extends UpdatePermittedModelDto {
  permittedModelId: string;
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
              model.id === id ? { ...model, ...data } : model,
            ),
        );
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(listQueryKey, context.previous);
        }
        try {
          const { code } = extractErrorData(error);
          const key =
            code === 'PERMITTED_MODEL_NOT_FOUND'
              ? 'teamDetail.models.updateNotFound'
              : 'teamDetail.models.updateError';
          showError(t(key));
        } catch {
          showError(t('teamDetail.models.updateError'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: listQueryKey });
      },
    },
  });

  function updateTeamPermittedModel({
    permittedModelId,
    ...data
  }: UpdateTeamPermittedModelParams) {
    mutation.mutate({
      teamId,
      id: permittedModelId,
      data,
    });
  }

  return {
    updateTeamPermittedModel,
    isUpdating: mutation.isPending,
  };
}
