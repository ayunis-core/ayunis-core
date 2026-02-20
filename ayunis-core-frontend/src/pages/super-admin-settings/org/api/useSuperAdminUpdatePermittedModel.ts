import {
  useSuperAdminModelsControllerUpdatePermittedModel,
  getSuperAdminModelsControllerGetAvailableModelsQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  prepareOptimisticUpdate,
  handleMutationError,
} from '@/widgets/permitted-model-mutations/lib/createPermittedModelMutation';

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
  const queryKey =
    getSuperAdminModelsControllerGetAvailableModelsQueryKey(orgId);

  const updatePermittedModelMutation =
    useSuperAdminModelsControllerUpdatePermittedModel({
      mutation: {
        onMutate: async ({ id, data }) =>
          prepareOptimisticUpdate(queryClient, queryKey, (models) =>
            models.map((model) =>
              model.permittedModelId === id
                ? { ...model, anonymousOnly: data.anonymousOnly }
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
                key[0].includes('superAdminModels')
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
            UPDATE_ERROR_MAP,
            'models.updatePermittedModel.error',
          );
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
