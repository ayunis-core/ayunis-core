import {
  useModelsControllerDeletePermittedModel,
  getModelsControllerGetAvailableImageGenerationModelsQueryKey,
  getModelsControllerGetAvailableLanguageModelsQueryKey,
  getModelsControllerGetAvailableEmbeddingModelsQueryKey,
  getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getAgentsControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
  type ModelWithConfigResponseDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  prepareOptimisticUpdate,
  rollbackOptimisticUpdate,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';

const ERROR_MAP: Record<string, string> = {
  CANNOT_DELETE_DEFAULT_MODEL: 'models.deletePermittedModel.errorDefaultModel',
  CANNOT_DELETE_LAST_MODEL: 'models.deletePermittedModel.errorLastModel',
};

export function useDeletePermittedModel() {
  const { t } = useTranslation('admin-settings-models');
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const availabilityQueryKeys = [
    getModelsControllerGetAvailableLanguageModelsQueryKey(),
    getModelsControllerGetAvailableEmbeddingModelsQueryKey(),
    getModelsControllerGetAvailableImageGenerationModelsQueryKey(),
  ];

  const deletePermittedModelMutation = useModelsControllerDeletePermittedModel({
    mutation: {
      onMutate: async ({ id }) => {
        const updater = (models: ModelWithConfigResponseDto[]) =>
          models.map((item) =>
            item.permittedModelId === id
              ? { ...item, isPermitted: false, permittedModelId: null }
              : item,
          );
        return Promise.all(
          availabilityQueryKeys.map((key) =>
            prepareOptimisticUpdate(queryClient, key, updater),
          ),
        );
      },
      onError: (error, _, contexts) => {
        contexts?.forEach((ctx) => rollbackOptimisticUpdate(queryClient, ctx));
        try {
          const { code } = extractErrorData(error);
          const key = ERROR_MAP[code] ?? 'models.deletePermittedModel.error';
          showError(t(key));
        } catch {
          showError(t('models.deletePermittedModel.error'));
        }
      },
      onSettled: () => {
        const queryKeys = [
          ...availabilityQueryKeys,
          getModelsControllerGetPermittedLanguageModelsQueryKey(),
          getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
          getAgentsControllerFindAllQueryKey(),
          getThreadsControllerFindAllQueryKey(),
        ];
        queryKeys.forEach((qk) => {
          void queryClient.invalidateQueries({ queryKey: qk });
        });
      },
    },
  });

  function deletePermittedModel(id: string) {
    confirm({
      title: t('models.deletePermittedModel.title'),
      description: t('models.deletePermittedModel.description'),
      confirmText: t('models.deletePermittedModel.confirmText'),
      cancelText: t('models.deletePermittedModel.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deletePermittedModelMutation.mutate({ id });
      },
    });
  }

  return {
    deletePermittedModel,
    isLoading: deletePermittedModelMutation.isPending,
    isError: deletePermittedModelMutation.isError,
    error: deletePermittedModelMutation.error,
  };
}
