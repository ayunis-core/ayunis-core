import {
  useSuperAdminModelsControllerUpdatePermittedModel,
  type ModelWithConfigResponseDto,
  getSuperAdminModelsControllerGetAvailableModelsQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';

interface UpdatePermittedModelParams {
  permittedModelId: string;
  anonymousOnly: boolean;
}

export function useSuperAdminUpdatePermittedModel(orgId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-models');
  const updatePermittedModelMutation =
    useSuperAdminModelsControllerUpdatePermittedModel({
      mutation: {
        onMutate: async ({ id, data }) => {
          const queryKey =
            getSuperAdminModelsControllerGetAvailableModelsQueryKey(orgId);
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
        onSettled: () => {
          // Invalidate queries by partial key
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
          try {
            const { code } = extractErrorData(err);
            if (code === 'PERMITTED_MODEL_NOT_FOUND') {
              showError(t('models.updatePermittedModel.notFound'));
            } else {
              showError(t('models.updatePermittedModel.error'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('models.updatePermittedModel.error'));
          }

          if (context?.previousData) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
        },
      },
    });

  function updatePermittedModel(params: UpdatePermittedModelParams) {
    updatePermittedModelMutation.mutate({
      orgId,
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
