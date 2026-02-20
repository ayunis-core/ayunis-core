import {
  useModelsControllerUpdatePermittedModel,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  prepareOptimisticUpdate,
  handleMutationError,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';

interface UpdatePermittedModelParams {
  permittedModelId: string;
  anonymousOnly: boolean;
}

const UPDATE_ERROR_MAP: Record<string, string> = {
  PERMITTED_MODEL_NOT_FOUND: 'models.updatePermittedModel.notFound',
};

export function useUpdatePermittedModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-models');
  const queryKey = getModelsControllerGetAvailableModelsWithConfigQueryKey();

  const updatePermittedModelMutation = useModelsControllerUpdatePermittedModel({
    mutation: {
      onMutate: async ({ id, data }) =>
        prepareOptimisticUpdate(queryClient, queryKey, (models) =>
          models.map((model) =>
            model.permittedModelId === id
              ? { ...model, anonymousOnly: data.anonymousOnly }
              : model,
          ),
        ),
      onError: (err, _, context) => {
        handleMutationError(
          err,
          queryClient,
          context,
          t,
          UPDATE_ERROR_MAP,
          'models.updatePermittedModel.error',
        );
      },
      onSettled: async () => {
        const queryKeys = [
          queryKey,
          getModelsControllerGetPermittedLanguageModelsQueryKey(),
        ];
        await Promise.all(
          queryKeys.map((qk) =>
            queryClient.invalidateQueries({ queryKey: qk }),
          ),
        );
      },
    },
  });

  function updatePermittedModel(params: UpdatePermittedModelParams) {
    updatePermittedModelMutation.mutate({
      id: params.permittedModelId,
      data: { anonymousOnly: params.anonymousOnly },
    });
  }

  return {
    updatePermittedModel,
    isLoading: updatePermittedModelMutation.isPending,
    isError: updatePermittedModelMutation.isError,
    error: updatePermittedModelMutation.error,
  };
}
