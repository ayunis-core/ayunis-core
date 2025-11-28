import {
  useModelsControllerUpdatePermittedModel,
  type ModelWithConfigResponseDto,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

interface UpdatePermittedModelParams {
  permittedModelId: string;
  anonymousOnly: boolean;
}

export function useUpdatePermittedModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-models');
  const updatePermittedModelMutation = useModelsControllerUpdatePermittedModel({
    mutation: {
      onMutate: async ({ id, data }) => {
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
              if (model.permittedModelId === id) {
                return {
                  ...model,
                  anonymousOnly: data.anonymousOnly,
                };
              }
              return model;
            });
          },
        );

        return { previousData, queryKey };
      },
      onError: (err, _, context) => {
        const { code } = extractErrorData(err);
        switch (code) {
          case 'PERMITTED_MODEL_NOT_FOUND':
            showError(t('models.updatePermittedModel.notFound'));
            break;
          default:
            showError(t('models.updatePermittedModel.error'));
            break;
        }

        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
      },
      onSettled: async () => {
        const queryKeys = [
          getModelsControllerGetAvailableModelsWithConfigQueryKey(),
          getModelsControllerGetPermittedLanguageModelsQueryKey(),
        ];
        await Promise.all(
          queryKeys.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
      },
    },
  });

  function updatePermittedModel(params: UpdatePermittedModelParams) {
    updatePermittedModelMutation.mutate({
      id: params.permittedModelId,
      data: {
        anonymousOnly: params.anonymousOnly,
      },
    });
  }

  return {
    updatePermittedModel,
    isLoading: updatePermittedModelMutation.isPending,
    isError: updatePermittedModelMutation.isError,
    error: updatePermittedModelMutation.error,
  };
}
