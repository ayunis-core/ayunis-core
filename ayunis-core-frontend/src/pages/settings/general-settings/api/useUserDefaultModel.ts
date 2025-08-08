import {
  useModelsControllerGetUserSpecificDefaultModel,
  useModelsControllerManageUserDefaultModel,
  useModelsControllerDeleteUserDefaultModel,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetEffectiveDefaultModelQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { SetUserDefaultModelDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { useQueryClient } from "@tanstack/react-query";
import type { UserDefaultModel } from "../model/openapi";
import { useRouter } from "@tanstack/react-router";
interface UseUserDefaultModelOptions {
  allModels: UserDefaultModel[];
}

export function useUserDefaultModel({ allModels }: UseUserDefaultModelOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKeys = [
    getModelsControllerGetUserSpecificDefaultModelQueryKey(),
    getModelsControllerGetEffectiveDefaultModelQueryKey(),
  ];

  // Get user default model
  const {
    data: userDefaultModel,
    error,
    refetch,
  } = useModelsControllerGetUserSpecificDefaultModel();

  // Manage user default model (handles both creating and updating)
  const manageUserDefaultModelMutation =
    useModelsControllerManageUserDefaultModel({
      mutation: {
        onMutate: async ({ data }: { data: SetUserDefaultModelDto }) => {
          console.log("Managing user default model");
          for (const queryKey of queryKeys) {
            await queryClient.cancelQueries({
              queryKey,
            });
          }
          const previousData = queryClient.getQueryData(
            getModelsControllerGetUserSpecificDefaultModelQueryKey(),
          );

          // Find the actual model from the provided models
          const selectedModel = allModels.find(
            (model) => model.id === data.permittedModelId,
          );

          if (selectedModel) {
            queryClient.setQueryData(
              getModelsControllerGetUserSpecificDefaultModelQueryKey(),
              selectedModel,
            );
          }

          return { previousData };
        },
        onSettled: () => {
          for (const queryKey of queryKeys) {
            queryClient.invalidateQueries({
              queryKey,
            });
          }
          router.invalidate();
        },
        onError: (err: any, _: any, context: any) => {
          console.error("Error managing user default model", err);
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
          console.log("Deleting user default model");
          for (const queryKey of queryKeys) {
            await queryClient.cancelQueries({
              queryKey,
            });
          }
          const previousData = queryClient.getQueryData(
            getModelsControllerGetUserSpecificDefaultModelQueryKey(),
          );

          // Optimistically set to null (no default model)
          queryClient.setQueryData(
            getModelsControllerGetUserSpecificDefaultModelQueryKey(),
            null,
          );
          return { previousData };
        },
        onSuccess: () => {
          for (const queryKey of queryKeys) {
            queryClient.invalidateQueries({
              queryKey,
            });
          }
        },
        onError: (err: any, _: any, context: any) => {
          console.error("Error deleting user default model", err);
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
    userDefaultModel: userDefaultModel || null,
    error,
    manageError: manageUserDefaultModelMutation.error,
    deleteError: deleteUserDefaultModelMutation.error,
    manageUserDefaultModel, // Handles both create and update
    deleteUserDefaultModel,
    refetch,
  };
}
