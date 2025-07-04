import {
  useModelsControllerDeletePermittedProvider,
  type PermittedProviderResponseDto,
  type DeletePermittedProviderDto,
} from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";

export function useDeletePermittedProvider() {
  const queryClient = useQueryClient();
  const deletePermittedProviderMutation =
    useModelsControllerDeletePermittedProvider({
      mutation: {
        onMutate: async ({ data }) => {
          console.log("Deleting permitted provider");
          await queryClient.cancelQueries({
            queryKey: ["permitted-providers"],
          });
          const previousData = queryClient.getQueryData([
            "permitted-providers",
          ]);
          queryClient.setQueryData(
            ["permitted-providers"],
            (old: PermittedProviderResponseDto[]) => {
              if (!old) return [];
              return old.filter((p) => p.provider !== data.provider);
            },
          );
          return { previousData };
        },
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["permitted-providers"],
          });
          queryClient.invalidateQueries({
            queryKey: ["permitted-models"],
          });
        },
        onError: (err, _, context) => {
          console.error("Error deleting permitted provider", err);
          queryClient.setQueryData(
            ["permitted-providers"],
            context?.previousData,
          );
        },
      },
    });

  function deletePermittedProvider(provider: DeletePermittedProviderDto) {
    console.log("Deleting permitted provider", provider);
    deletePermittedProviderMutation.mutate(
      {
        data: provider,
      },
      {},
    );
  }

  return {
    deletePermittedProvider,
    isLoading: deletePermittedProviderMutation.isPending,
    isError: deletePermittedProviderMutation.isError,
    error: deletePermittedProviderMutation.error,
  };
}
