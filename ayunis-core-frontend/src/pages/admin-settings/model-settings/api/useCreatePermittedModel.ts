import {
  useModelsControllerCreatePermittedModel,
  type ModelWithConfigResponseDto,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
} from '@/shared/api';
import type { Model } from '../model/openapi';
import { useQueryClient } from '@tanstack/react-query';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useCreatePermittedModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-models');
  const createPermittedModelMutation = useModelsControllerCreatePermittedModel({
    mutation: {
      onMutate: async ({ data }) => {
        const queryKey =
          getModelsControllerGetAvailableModelsWithConfigQueryKey();
        await queryClient.cancelQueries({
          queryKey,
        });
        const previousData =
          queryClient.getQueryData<ModelWithConfigResponseDto[]>(queryKey);

        // Optimistically update to the new value
        queryClient.setQueryData<ModelWithConfigResponseDto[]>(
          queryKey,
          (old) => {
            if (!old) {
              return old;
            }
            return old.map((model) => {
              if (model.modelId === data.modelId) {
                return {
                  ...model,
                  isPermitted: true,
                };
              }
              return model;
            });
          },
        );

        return { previousData, queryKey };
      },
      onError: (err, _, context) => {
        try {
          const { code } = extractErrorData(err);
          switch (code) {
            case 'MULTIPLE_EMBEDDING_MODELS_NOT_ALLOWED':
              showError(
                t(
                  'models.createPermittedModel.multipleEmbeddingModelsNotAllowed',
                ),
              );
              break;
            case 'MODEL_NOT_FOUND':
              showError(t('models.createPermittedModel.modelNotFound'));
              break;
            default:
              showError(t('models.createPermittedModel.error'));
              break;
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('models.createPermittedModel.error'));
        }

        if (context?.previousData) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
      },
      onSettled: async () => {
        const queryKeys = [
          getModelsControllerGetAvailableModelsWithConfigQueryKey(),
          getModelsControllerGetPermittedLanguageModelsQueryKey(),
          getModelsControllerGetUserSpecificDefaultModelQueryKey(),
        ];
        await Promise.all(
          queryKeys.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
      },
    },
  });

  function createPermittedModel(model: Model) {
    createPermittedModelMutation.mutate({
      data: model,
    });
  }

  return {
    createPermittedModel,
    isLoading: createPermittedModelMutation.isPending,
    isError: createPermittedModelMutation.isError,
    error: createPermittedModelMutation.error,
  };
}
