import {
  getModelsControllerGetAvailableLanguageModelsQueryKey,
  getModelsControllerGetAvailableEmbeddingModelsQueryKey,
  getModelsControllerGetAvailableImageGenerationModelsQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  type ModelWithConfigResponseDto,
  useModelsDefaultsControllerManageOrgDefaultModel,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';

interface ManageOrgDefaultModelContext {
  previousModels?: ModelWithConfigResponseDto[];
  queryKey: ReturnType<
    typeof getModelsControllerGetAvailableLanguageModelsQueryKey
  >;
}

export function useManageOrgDefaultModel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-models');
  const router = useRouter();
  const manageOrgDefaultModelMutation =
    useModelsDefaultsControllerManageOrgDefaultModel({
      mutation: {
        onMutate: async ({ data }) => {
          const queryKey =
            getModelsControllerGetAvailableLanguageModelsQueryKey();
          await queryClient.cancelQueries({ queryKey });

          const previousModels =
            queryClient.getQueryData<ModelWithConfigResponseDto[]>(queryKey);

          queryClient.setQueryData<ModelWithConfigResponseDto[]>(
            queryKey,
            (old) => {
              if (!old) {
                return old;
              }

              return old.map((model) => {
                if (!model.permittedModelId) {
                  return { ...model, isDefault: false };
                }

                return {
                  ...model,
                  isDefault:
                    model.permittedModelId === data.permittedModelId &&
                    model.isPermitted,
                };
              });
            },
          );

          return { previousModels, queryKey };
        },
        onSuccess: () => {
          showSuccess(t('models.defaultModel.success'));
        },
        onError: (
          error: unknown,
          _: unknown,
          context: ManageOrgDefaultModelContext | undefined,
        ) => {
          console.error('Failed to set organization default model', error);
          showError(t('models.defaultModel.error'));

          if (context?.previousModels) {
            queryClient.setQueryData(context.queryKey, context.previousModels);
          }
        },
        onSettled: async () => {
          const queryKeys = [
            getModelsControllerGetAvailableLanguageModelsQueryKey(),
            getModelsControllerGetAvailableEmbeddingModelsQueryKey(),
            getModelsControllerGetAvailableImageGenerationModelsQueryKey(),
            getModelsControllerGetPermittedLanguageModelsQueryKey(),
          ];

          await Promise.all(
            queryKeys.map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          );
          await router.invalidate();
        },
      },
    });

  function manageOrgDefaultModel(permittedModelId: string) {
    manageOrgDefaultModelMutation.mutate({
      data: { permittedModelId },
    });
  }

  return {
    manageOrgDefaultModel,
    isLoading: manageOrgDefaultModelMutation.isPending,
    isError: manageOrgDefaultModelMutation.isError,
    error: manageOrgDefaultModelMutation.error,
  };
}
