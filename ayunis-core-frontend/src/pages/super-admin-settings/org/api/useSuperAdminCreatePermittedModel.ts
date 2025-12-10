import {
  useSuperAdminModelsControllerCreatePermittedModel,
  type CreatePermittedModelDto,
  type ModelWithConfigResponseDto,
  getSuperAdminModelsControllerGetAvailableModelsQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';

export function useSuperAdminCreatePermittedModel(orgId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-models');
  const createPermittedModelMutation =
    useSuperAdminModelsControllerCreatePermittedModel({
      mutation: {
        onMutate: async ({ data }) => {
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
                if (model.modelId === data.modelId) {
                  return {
                    ...model,
                    isPermitted: true,
                  };
                }
                return model;
              });
            },
          );

          return { previousData, queryKey };
        },
        onSettled: () => {
          // Invalidate queries by partial key until API is regenerated
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
          try {
            const { code } = extractErrorData(err);
            switch (code) {
              case 'MULTIPLE_EMBEDDING_MODELS_NOT_ALLOWED':
                showError(
                  t(
                    'models.createPermittedModel.multipleEmbeddingModelsNotAllowed',
                  ),
                );
                break;
              case 'MODEL_PROVIDER_NOT_PERMITTED':
                showError(
                  t('models.createPermittedModel.modelProviderNotPermitted'),
                );
                break;
              case 'MODEL_NOT_FOUND':
                showError(t('models.createPermittedModel.modelNotFound'));
                break;
              default:
                showError(t('models.createPermittedModel.error'));
                break;
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('models.createPermittedModel.error'));
          }

          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
        },
      },
    });

  function createPermittedModel(data: CreatePermittedModelDto) {
    createPermittedModelMutation.mutate({
      orgId,
      data,
    });
  }

  return {
    createPermittedModel,
    isLoading: createPermittedModelMutation.isPending,
    isError: createPermittedModelMutation.isError,
    error: createPermittedModelMutation.error,
  };
}
