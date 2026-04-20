import {
  useModelsControllerCreatePermittedModel,
  getModelsControllerGetAvailableImageGenerationModelsQueryKey,
  getModelsControllerGetAvailableLanguageModelsQueryKey,
  getModelsControllerGetAvailableEmbeddingModelsQueryKey,
  getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  type ModelWithConfigResponseDto,
} from '@/shared/api';
import type { Model } from '../model/openapi';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  prepareOptimisticUpdate,
  rollbackOptimisticUpdate,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

const CREATE_ERROR_MAP: Record<string, string> = {
  MULTIPLE_EMBEDDING_MODELS_NOT_ALLOWED:
    'models.createPermittedModel.multipleEmbeddingModelsNotAllowed',
  MULTIPLE_IMAGE_GENERATION_MODELS_NOT_ALLOWED:
    'models.createPermittedModel.multipleImageGenerationModelsNotAllowed',
  MODEL_NOT_FOUND: 'models.createPermittedModel.modelNotFound',
};

export function useCreatePermittedModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-models');
  const availabilityQueryKeys = [
    getModelsControllerGetAvailableLanguageModelsQueryKey(),
    getModelsControllerGetAvailableEmbeddingModelsQueryKey(),
    getModelsControllerGetAvailableImageGenerationModelsQueryKey(),
  ];

  const createPermittedModelMutation = useModelsControllerCreatePermittedModel({
    mutation: {
      onMutate: async ({ data }) => {
        const updater = (models: ModelWithConfigResponseDto[]) =>
          models.map((model) =>
            model.modelId === data.modelId
              ? { ...model, isPermitted: true }
              : model,
          );
        return Promise.all(
          availabilityQueryKeys.map((key) =>
            prepareOptimisticUpdate(queryClient, key, updater),
          ),
        );
      },
      onError: (err, _, contexts) => {
        contexts?.forEach((ctx) => rollbackOptimisticUpdate(queryClient, ctx));
        try {
          const { code } = extractErrorData(err);
          const key =
            CREATE_ERROR_MAP[code] ?? 'models.createPermittedModel.error';
          showError(t(key));
        } catch {
          showError(t('models.createPermittedModel.error'));
        }
      },
      onSettled: async () => {
        const queryKeys = [
          ...availabilityQueryKeys,
          getModelsControllerGetPermittedLanguageModelsQueryKey(),
          getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
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
