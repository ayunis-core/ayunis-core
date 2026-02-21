import {
  useModelsControllerCreatePermittedModel,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
} from '@/shared/api';
import type { Model } from '../model/openapi';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  prepareOptimisticUpdate,
  handleMutationError,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';

const CREATE_ERROR_MAP: Record<string, string> = {
  MULTIPLE_EMBEDDING_MODELS_NOT_ALLOWED:
    'models.createPermittedModel.multipleEmbeddingModelsNotAllowed',
  MODEL_NOT_FOUND: 'models.createPermittedModel.modelNotFound',
};

export function useCreatePermittedModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-models');
  const queryKey = getModelsControllerGetAvailableModelsWithConfigQueryKey();

  const createPermittedModelMutation = useModelsControllerCreatePermittedModel({
    mutation: {
      onMutate: async ({ data }) =>
        prepareOptimisticUpdate(queryClient, queryKey, (models) =>
          models.map((model) =>
            model.modelId === data.modelId
              ? { ...model, isPermitted: true }
              : model,
          ),
        ),
      onError: (err, _, context) => {
        handleMutationError(
          err,
          queryClient,
          context,
          t,
          CREATE_ERROR_MAP,
          'models.createPermittedModel.error',
        );
      },
      onSettled: async () => {
        const queryKeys = [
          queryKey,
          getModelsControllerGetPermittedLanguageModelsQueryKey(),
          getModelsControllerGetUserSpecificDefaultModelQueryKey(),
        ];
        await Promise.all(
          queryKeys.map((qk) =>
            queryClient.invalidateQueries({ queryKey: qk }),
          ),
        );
      },
    },
  });

  function createPermittedModel(model: Model) {
    createPermittedModelMutation.mutate({ data: model });
  }

  return {
    createPermittedModel,
    isLoading: createPermittedModelMutation.isPending,
    isError: createPermittedModelMutation.isError,
    error: createPermittedModelMutation.error,
  };
}
