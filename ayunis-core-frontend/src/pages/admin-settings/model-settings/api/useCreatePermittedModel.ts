import {
  useModelsControllerCreatePermittedModel,
  type ModelWithConfigResponseDto,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedModelsQueryKey,
} from "@/shared/api";
import { type Model } from "../model/openapi";
import { useQueryClient } from "@tanstack/react-query";

export function useCreatePermittedModel() {
  const queryClient = useQueryClient();
  const createPermittedModelMutation = useModelsControllerCreatePermittedModel({
    mutation: {
      onMutate: async ({ data }) => {
        const queryKey =
          getModelsControllerGetAvailableModelsWithConfigQueryKey();
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
              console.warn("No previous data found for optimistic update");
              return old;
            }
            return old.map((model) => {
              if (model.modelId === data.modelId) {
                console.log(
                  "Found matching model, updating isPermitted to true",
                );
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
      onError: (err, _, context) => {
        console.error("Error creating permitted model", err);
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
      },
      onSettled: () => {
        const queryKeys = [
          getModelsControllerGetAvailableModelsWithConfigQueryKey(),
          getModelsControllerGetPermittedModelsQueryKey(),
          getModelsControllerGetUserSpecificDefaultModelQueryKey(),
        ];
        queryKeys.forEach((queryKey) => {
          queryClient.invalidateQueries({
            queryKey,
          });
        });
      },
    },
  });

  function createPermittedModel(model: Model) {
    createPermittedModelMutation.mutate({
      data: model,
    });
  }

  return {
    createPermittedModel,
    isLoading: createPermittedModelMutation.isPending,
    isError: createPermittedModelMutation.isError,
    error: createPermittedModelMutation.error,
  };
}
