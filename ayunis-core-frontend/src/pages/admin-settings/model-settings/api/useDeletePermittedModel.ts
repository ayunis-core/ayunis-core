import {
  useModelsControllerDeletePermittedModel,
  type ModelWithConfigResponseDto,
} from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";

export function useDeletePermittedModel() {
  const queryClient = useQueryClient();
  const deletePermittedModelMutation = useModelsControllerDeletePermittedModel({
    mutation: {
      onMutate: async ({ id }) => {
        console.log("Deleting permitted model");
        await queryClient.cancelQueries({
          queryKey: ["permitted-models"],
        });
        const previousData = queryClient.getQueryData(["permitted-models"]);

        queryClient.setQueryData(
          ["permitted-models"],
          (old: ModelWithConfigResponseDto[]) => {
            return old.map((item: ModelWithConfigResponseDto) => {
              if (item.id === id) {
                return { ...item, isPermitted: false };
              }
              return item;
            });
          },
        );
        return { previousData };
      },
      onSuccess: () => {
        console.log("Delete permitted model succeeded, invalidating queries");
        queryClient.invalidateQueries({
          queryKey: ["permitted-models"],
        });
        console.log("model deleted");
      },
      onError: (err, _, context) => {
        console.error("Error deleting permitted model", err);
        queryClient.setQueryData(["permitted-models"], context?.previousData);
      },
    },
  });

  function deletePermittedModel(id: string) {
    deletePermittedModelMutation.mutate({
      id,
    });
  }

  return {
    deletePermittedModel,
    isLoading: deletePermittedModelMutation.isPending,
    isError: deletePermittedModelMutation.isError,
    error: deletePermittedModelMutation.error,
  };
}
