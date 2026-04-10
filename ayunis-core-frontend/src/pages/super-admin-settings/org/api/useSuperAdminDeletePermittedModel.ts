import {
  useSuperAdminPermittedModelsControllerDeletePermittedModel,
  type ModelWithConfigResponseDto,
  getSuperAdminPermittedModelsControllerGetAvailableLanguageModelsQueryKey,
  getSuperAdminPermittedModelsControllerGetAvailableEmbeddingModelsQueryKey,
  getSuperAdminPermittedModelsControllerGetAvailableImageGenerationModelsQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  prepareOptimisticUpdate,
  rollbackOptimisticUpdate,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';
import { invalidatePermittedModelQueries } from './invalidatePermittedModelQueries';

const DELETE_ERROR_MAP: Record<string, string> = {
  CANNOT_DELETE_DEFAULT_MODEL: 'models.deletePermittedModel.errorDefaultModel',
  CANNOT_DELETE_LAST_MODEL: 'models.deletePermittedModel.errorLastModel',
};

export function useSuperAdminDeletePermittedModel(orgId: string) {
  const { t } = useTranslation('admin-settings-models');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { confirm } = useConfirmation();
  const availabilityQueryKeys = [
    getSuperAdminPermittedModelsControllerGetAvailableLanguageModelsQueryKey(
      orgId,
    ),
    getSuperAdminPermittedModelsControllerGetAvailableEmbeddingModelsQueryKey(
      orgId,
    ),
    getSuperAdminPermittedModelsControllerGetAvailableImageGenerationModelsQueryKey(
      orgId,
    ),
  ];

  const deletePermittedModelMutation =
    useSuperAdminPermittedModelsControllerDeletePermittedModel({
      mutation: {
        onMutate: async ({ id }) => {
          const updater = (models: ModelWithConfigResponseDto[]) =>
            models.map((model) =>
              model.permittedModelId === id
                ? { ...model, isPermitted: false, permittedModelId: null }
                : model,
            );
          return Promise.all(
            availabilityQueryKeys.map((key) =>
              prepareOptimisticUpdate(queryClient, key, updater),
            ),
          );
        },
        onSettled: () => {
          invalidatePermittedModelQueries(queryClient, router, orgId);
        },
        onError: (error, _, contexts) => {
          contexts?.forEach((ctx) =>
            rollbackOptimisticUpdate(queryClient, ctx),
          );
          try {
            const { code } = extractErrorData(error);
            const key =
              DELETE_ERROR_MAP[code] ?? 'models.deletePermittedModel.error';
            showError(t(key));
          } catch {
            showError(t('models.deletePermittedModel.error'));
          }
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
