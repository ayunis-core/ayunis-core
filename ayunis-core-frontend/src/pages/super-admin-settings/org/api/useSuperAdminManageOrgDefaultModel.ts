import {
  getSuperAdminModelsControllerGetAvailableModelsQueryKey,
  getSuperAdminModelsControllerGetPermittedModelsQueryKey,
  type ModelWithConfigResponseDto,
  useSuperAdminModelsControllerManageOrgDefaultModel,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';

export function useSuperAdminManageOrgDefaultModel(orgId: string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-models');
  const router = useRouter();

  const manageOrgDefaultModelMutation =
    useSuperAdminModelsControllerManageOrgDefaultModel({
      mutation: {
        onMutate: async ({ data }) => {
          const queryKey =
            getSuperAdminModelsControllerGetAvailableModelsQueryKey(orgId);
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
                if (!model.permittedModelId || !model.isPermitted) {
                  return { ...model, isDefault: false };
                }

                return {
                  ...model,
                  isDefault: model.permittedModelId === data.permittedModelId,
                };
              });
            },
          );

          return { previousModels, queryKey };
        },
        onSuccess: () => {
          showSuccess(t('models.defaultModel.success'));
        },
        onError: (_, __, context) => {
          showError(t('models.defaultModel.error'));

          if (context?.previousModels) {
            queryClient.setQueryData(context.queryKey, context.previousModels);
          }
        },
        onSettled: async () => {
          const queryKeys = [
            getSuperAdminModelsControllerGetAvailableModelsQueryKey(orgId),
            getSuperAdminModelsControllerGetPermittedModelsQueryKey(orgId),
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
      orgId,
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
