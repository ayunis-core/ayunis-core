import {
  useModelsControllerGetUserSpecificDefaultModel,
  useModelsControllerManageUserDefaultModel,
  useModelsControllerDeleteUserDefaultModel,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetEffectiveDefaultModelQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  PermittedLanguageModelResponseDtoNullable,
  SetUserDefaultModelDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import type { UserDefaultModel } from '../model/openapi';
import { useRouter } from '@tanstack/react-router';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
interface UseUserDefaultModelOptions {
  allModels: UserDefaultModel[];
}

export function useUserDefaultModel({ allModels }: UseUserDefaultModelOptions) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKeys = [
    getModelsControllerGetUserSpecificDefaultModelQueryKey(),
    getModelsControllerGetEffectiveDefaultModelQueryKey(),
  ];

  // Get user default model
  const {
    data: userDefaultModelResponse,
    error,
    refetch,
  } = useModelsControllerGetUserSpecificDefaultModel();

  // Manage user default model (handles both creating and updating)
  const manageUserDefaultModelMutation =
    useModelsControllerManageUserDefaultModel({
      mutation: {
        onMutate: async ({ data }: { data: SetUserDefaultModelDto }) => {
          await Promise.all(
            queryKeys.map((queryKey) =>
              queryClient.cancelQueries({ queryKey }),
            ),
          );
          const previousData =
            queryClient.getQueryData<PermittedLanguageModelResponseDtoNullable>(
              getModelsControllerGetUserSpecificDefaultModelQueryKey(),
            );

          // Find the actual model from the provided models
          const selectedModel = allModels.find(
            (model) => model.id === data.permittedModelId,
          );

          if (selectedModel) {
            queryClient.setQueryData(
              getModelsControllerGetUserSpecificDefaultModelQueryKey(),
              {
                permittedLanguageModel: selectedModel,
              },
            );
          }

          return { previousData };
        },
        onSettled: async () => {
          await Promise.all(
            queryKeys.map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          );
          await router.invalidate();
        },
        onError: (
          err: unknown,
          _: unknown,
          context:
            | { previousData?: PermittedLanguageModelResponseDtoNullable }
            | undefined,
        ) => {
          console.error('Error managing user default model', err);
          showError(t('chat.defaultModelError'));
          queryClient.setQueryData(
            getModelsControllerGetUserSpecificDefaultModelQueryKey(),
            context?.previousData,
          );
        },
      },
    });

  // Delete user default model
  const deleteUserDefaultModelMutation =
    useModelsControllerDeleteUserDefaultModel({
      mutation: {
        onMutate: async () => {
          await Promise.all(
            queryKeys.map((queryKey) =>
              queryClient.cancelQueries({ queryKey }),
            ),
          );
          const previousData =
            queryClient.getQueryData<PermittedLanguageModelResponseDtoNullable>(
              getModelsControllerGetUserSpecificDefaultModelQueryKey(),
            );

          // Optimistically set to null (no default model)
          queryClient.setQueryData(
            getModelsControllerGetUserSpecificDefaultModelQueryKey(),
            { permittedLanguageModel: null },
          );
          return { previousData };
        },
        onSuccess: async () => {
          await Promise.all(
            queryKeys.map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          );
          await router.invalidate();
        },
        onError: (
          err: unknown,
          _: unknown,
          context:
            | { previousData?: PermittedLanguageModelResponseDtoNullable }
            | undefined,
        ) => {
          console.error('Error deleting user default model', err);
          showError(t('chat.defaultModelError'));
          queryClient.setQueryData(
            getModelsControllerGetUserSpecificDefaultModelQueryKey(),
            context?.previousData,
          );
        },
      },
    });

  // Helper functions
  function manageUserDefaultModel(permittedModelId: string) {
    const data: SetUserDefaultModelDto = { permittedModelId };
    return manageUserDefaultModelMutation.mutate({ data });
  }

  function deleteUserDefaultModel() {
    return deleteUserDefaultModelMutation.mutate();
  }

  return {
    userDefaultModel: userDefaultModelResponse?.permittedLanguageModel ?? null,
    error,
    manageError: manageUserDefaultModelMutation.error as Error | null,
    deleteError: deleteUserDefaultModelMutation.error as Error | null,
    manageUserDefaultModel, // Handles both create and update
    deleteUserDefaultModel,
    refetch,
  };
}
