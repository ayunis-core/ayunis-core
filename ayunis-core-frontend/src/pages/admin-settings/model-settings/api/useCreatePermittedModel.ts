import {
  useModelsControllerCreatePermittedModel,
  type ModelWithConfigResponseDto,
} from "@/shared/api";
import { type Model } from "../model/openapi";
import { useQueryClient } from "@tanstack/react-query";

export function useCreatePermittedModel() {
  const queryClient = useQueryClient();
  const createPermittedModelMutation = useModelsControllerCreatePermittedModel({
    mutation: {
      onMutate: async ({ data }) => {
        console.log("Creating permitted model");
        await queryClient.cancelQueries({
          queryKey: ["permitted-models"],
        });
        const previousData = queryClient.getQueryData(["permitted-models"]);
        queryClient.setQueryData(
          ["permitted-models"],
          (old: ModelWithConfigResponseDto[]) => {
            return [...old, data];
          },
        );
        return { previousData };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["permitted-models"],
        });
      },
      onError: (err, _, context) => {
        console.error("Error creating permitted model", err);
        queryClient.setQueryData(["permitted-models"], context?.previousData);
      },
    },
  });

  function createPermittedModel(model: Model) {
    console.log("Creating permitted model", model);
    createPermittedModelMutation.mutate(
      {
        data: model,
      },
      {},
    );
  }

  return {
    createPermittedModel,
    isLoading: createPermittedModelMutation.isPending,
    isError: createPermittedModelMutation.isError,
    error: createPermittedModelMutation.error,
  };
}
