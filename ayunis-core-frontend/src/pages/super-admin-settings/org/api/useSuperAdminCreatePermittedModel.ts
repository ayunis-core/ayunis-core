import {
  useSuperAdminModelsControllerCreatePermittedModel,
  type CreatePermittedModelDto,
  getSuperAdminModelsControllerGetAvailableModelsQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  prepareOptimisticUpdate,
  handleMutationError,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';

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
  const queryKey =
    getSuperAdminModelsControllerGetAvailableModelsQueryKey(orgId);

  const createPermittedModelMutation =
    useSuperAdminModelsControllerCreatePermittedModel({
      mutation: {
        onMutate: async ({ data }) =>
          prepareOptimisticUpdate(queryClient, queryKey, (models) =>
            models.map((model) =>
              model.modelId === data.modelId
                ? { ...model, isPermitted: true }
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
