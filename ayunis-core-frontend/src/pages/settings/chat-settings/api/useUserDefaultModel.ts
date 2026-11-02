import {
  useModelsDefaultsControllerGetUserSpecificDefaultModel,
  useModelsDefaultsControllerManageUserDefaultModel,
  useModelsDefaultsControllerDeleteUserDefaultModel,
  getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey,
  getModelModeDefaultsControllerGetDefaultSelectionQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  PermittedLanguageModelResponseDtoNullable,
  SetUserDefaultModelDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import {
  clearModelModeDefaultCache,
  getModelModeDefaultQueryKey,
} from '@/features/model-mode-defaults';
import type { UserDefaultModel } from '@/pages/settings/chat-settings/model/openapi';
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
    getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
    getModelModeDefaultsControllerGetDefaultSelectionQueryKey(),
    // Setting or deleting a model default clears the personal mode default.
    getModelModeDefaultQueryKey({ level: 'user' }),
  ];

  // Get user default model
  const {
    data: userDefaultModelResponse,
    error,
    refetch,
  } = useModelsDefaultsControllerGetUserSpecificDefaultModel();

  // Manage user default model (handles both creating and updating)
  const manageUserDefaultModelMutation =
    useModelsDefaultsControllerManageUserDefaultModel({
      mutation: {
        onMutate: async ({ data }: { data: SetUserDefaultModelDto }) => {
          await Promise.all(
            queryKeys.map((queryKey) =>
              queryClient.cancelQueries({ queryKey }),
            ),
          );
          const previousData =
            queryClient.getQueryData<PermittedLanguageModelResponseDtoNullable>(
              getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
            );

          // Find the actual model from the provided models
          const selectedModel = allModels.find(
            (model) => model.id === data.permittedModelId,
          );

          if (selectedModel) {
            queryClient.setQueryData(
              getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
              {
                permittedLanguageModel: selectedModel,
              },
            );
          }

          const restoreMode = await clearModelModeDefaultCache(queryClient, {
            level: 'user',
          });
          return { previousData, restoreMode };
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
            | {
                previousData?: PermittedLanguageModelResponseDtoNullable;
                restoreMode?: () => void;
              }
            | undefined,
        ) => {
          console.error('Error managing user default model', err);
          showError(t('chat.defaultModelError'));
          queryClient.setQueryData(
            getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
            context?.previousData,
          );
          context?.restoreMode?.();
        },
      },
    });

  // Delete user default model
  const deleteUserDefaultModelMutation =
    useModelsDefaultsControllerDeleteUserDefaultModel({
      mutation: {
        onMutate: async () => {
          await Promise.all(
            queryKeys.map((queryKey) =>
              queryClient.cancelQueries({ queryKey }),
            ),
          );
          const previousData =
            queryClient.getQueryData<PermittedLanguageModelResponseDtoNullable>(
              getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
            );

          // Optimistically set to null (no default model)
          queryClient.setQueryData(
            getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
            { permittedLanguageModel: null },
          );
          const restoreMode = await clearModelModeDefaultCache(queryClient, {
            level: 'user',
          });
          return { previousData, restoreMode };
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
            | {
                previousData?: PermittedLanguageModelResponseDtoNullable;
                restoreMode?: () => void;
              }
            | undefined,
        ) => {
          console.error('Error deleting user default model', err);
          showError(t('chat.defaultModelError'));
          queryClient.setQueryData(
            getModelsDefaultsControllerGetUserSpecificDefaultModelQueryKey(),
            context?.previousData,
          );
          context?.restoreMode?.();
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
