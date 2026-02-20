import {
  useModelsControllerDeletePermittedModel,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getAgentsControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  prepareOptimisticUpdate,
  handleMutationError,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';

const ERROR_MAP: Record<string, string> = {
  CANNOT_DELETE_DEFAULT_MODEL: 'models.deletePermittedModel.errorDefaultModel',
  CANNOT_DELETE_LAST_MODEL: 'models.deletePermittedModel.errorLastModel',
};

export function useDeletePermittedModel() {
  const { t } = useTranslation('admin-settings-models');
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const queryKey = getModelsControllerGetAvailableModelsWithConfigQueryKey();

  const deletePermittedModelMutation = useModelsControllerDeletePermittedModel({
    mutation: {
      onMutate: async ({ id }) =>
        prepareOptimisticUpdate(queryClient, queryKey, (old) =>
          old.map((item) =>
            item.permittedModelId === id
              ? { ...item, isPermitted: false }
              : item,
          ),
        ),
      onError: (error, _, context) => {
        handleMutationError(
          error,
          queryClient,
          context,
          t,
          ERROR_MAP,
          'models.deletePermittedModel.error',
        );
      },
      onSettled: () => {
        const queryKeys = [
          queryKey,
          getModelsControllerGetPermittedLanguageModelsQueryKey(),
          getModelsControllerGetUserSpecificDefaultModelQueryKey(),
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
