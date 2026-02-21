import {
  useSuperAdminModelsControllerDeletePermittedModel,
  getSuperAdminModelsControllerGetAvailableModelsQueryKey,
} from '@/shared/api';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  prepareOptimisticUpdate,
  handleMutationError,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';

const DELETE_ERROR_MAP: Record<string, string> = {
  CANNOT_DELETE_DEFAULT_MODEL: 'models.deletePermittedModel.errorDefaultModel',
  CANNOT_DELETE_LAST_MODEL: 'models.deletePermittedModel.errorLastModel',
};

export function useSuperAdminDeletePermittedModel(orgId: string) {
  const { t } = useTranslation('admin-settings-models');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { confirm } = useConfirmation();
  const queryKey =
    getSuperAdminModelsControllerGetAvailableModelsQueryKey(orgId);

  const deletePermittedModelMutation =
    useSuperAdminModelsControllerDeletePermittedModel({
      mutation: {
        onMutate: async ({ id }) =>
          prepareOptimisticUpdate(queryClient, queryKey, (models) =>
            models.map((model) =>
              model.permittedModelId === id
                ? { ...model, isPermitted: false, permittedModelId: null }
                : model,
            ),
          ),
        onSettled: () => {
          void queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                Array.isArray(key) &&
                key.length > 0 &&
                typeof key[0] === 'string' &&
                key[0].includes('superAdminModels') &&
                key[0].includes('permitted')
              );
            },
          });
          void router.invalidate();
        },
        onError: (error, _, context) => {
          handleMutationError(
            error,
            queryClient,
            context,
            t,
            DELETE_ERROR_MAP,
            'models.deletePermittedModel.error',
          );
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
        deletePermittedModelMutation.mutate({ orgId, id });
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
