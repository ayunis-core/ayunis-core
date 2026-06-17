import {
  useSuperAdminPermittedModelsControllerUpdatePermittedModel,
  type ModelWithConfigResponseDto,
  getSuperAdminPermittedModelsControllerGetAvailableLanguageModelsQueryKey,
  getSuperAdminPermittedModelsControllerGetAvailableEmbeddingModelsQueryKey,
  getSuperAdminPermittedModelsControllerGetAvailableImageGenerationModelsQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  prepareOptimisticUpdate,
  rollbackOptimisticUpdate,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';
import { invalidatePermittedModelQueries } from './invalidatePermittedModelQueries';

interface UpdatePermittedModelParams {
  permittedModelId: string;
  anonymousOnly: boolean;
}

const UPDATE_ERROR_MAP: Record<string, string> = {
  PERMITTED_MODEL_NOT_FOUND: 'models.updatePermittedModel.notFound',
};

export function useSuperAdminUpdatePermittedModel(orgId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-models');
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

  const updatePermittedModelMutation =
    useSuperAdminPermittedModelsControllerUpdatePermittedModel({
      mutation: {
        onMutate: async ({ id, data }) => {
          const updater = (models: ModelWithConfigResponseDto[]) =>
            models.map((model) =>
              model.permittedModelId === id
                ? { ...model, anonymousOnly: data.anonymousOnly }
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
        onError: (err, _, contexts) => {
          contexts?.forEach((ctx) =>
            rollbackOptimisticUpdate(queryClient, ctx),
          );
          try {
            const { code } = extractErrorData(err);
            const key =
              UPDATE_ERROR_MAP[code] ?? 'models.updatePermittedModel.error';
            showError(t(key));
          } catch {
            showError(t('models.updatePermittedModel.error'));
          }
        },
      },
    });

  function updatePermittedModel(params: UpdatePermittedModelParams) {
    updatePermittedModelMutation.mutate({
      orgId,
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
