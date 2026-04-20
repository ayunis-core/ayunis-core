import {
  useSuperAdminPermittedModelsControllerCreatePermittedModel,
  type CreatePermittedModelDto,
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

const CREATE_ERROR_MAP: Record<string, string> = {
  MULTIPLE_EMBEDDING_MODELS_NOT_ALLOWED:
    'models.createPermittedModel.multipleEmbeddingModelsNotAllowed',
  MODEL_PROVIDER_NOT_PERMITTED:
    'models.createPermittedModel.modelProviderNotPermitted',
  MODEL_NOT_FOUND: 'models.createPermittedModel.modelNotFound',
};

export function useSuperAdminCreatePermittedModel(orgId: string) {
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

  const createPermittedModelMutation =
    useSuperAdminPermittedModelsControllerCreatePermittedModel({
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
              CREATE_ERROR_MAP[code] ?? 'models.createPermittedModel.error';
            showError(t(key));
          } catch {
            showError(t('models.createPermittedModel.error'));
          }
        },
      },
    });

  function createPermittedModel(data: CreatePermittedModelDto) {
    createPermittedModelMutation.mutate({ orgId, data });
  }

  return {
    createPermittedModel,
    isLoading: createPermittedModelMutation.isPending,
    isError: createPermittedModelMutation.isError,
    error: createPermittedModelMutation.error,
  };
}
