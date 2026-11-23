import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
  useTeamPermittedModelsControllerUpdateTeamPermittedModel,
  type PermittedLanguageModelResponseDto,
  type UpdatePermittedModelDto,
} from '@ayunis/api-client';
import { applyPolicyUpdate } from '@/widgets/permitted-model-mutations/lib/applyPolicyUpdate';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { invalidateTeamModelAccessQueries } from './invalidateTeamModelAccessQueries';

type UpdateTeamPermittedModelParams = {
  permittedModelId: string;
} & UpdatePermittedModelDto;

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
              model.id === id ? applyPolicyUpdate(model, data) : model,
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
      data: {
        anonymousOnly: params.anonymousOnly,
        memoryAccess: params.memoryAccess,
        chatHistoryAccess: params.chatHistoryAccess,
      },
    });
  }

  return {
    updateTeamPermittedModel,
    isUpdating: mutation.isPending,
  };
}
