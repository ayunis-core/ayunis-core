import {
  useModelsControllerDeletePermittedProvider,
  type PermittedProviderResponseDto,
  type DeletePermittedProviderDto,
  getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
} from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";

export function useDeletePermittedProvider() {
  const queryClient = useQueryClient();
  const deletePermittedProviderMutation =
    useModelsControllerDeletePermittedProvider({
      mutation: {
        onMutate: async ({ data }) => {
          console.log("Deleting permitted provider");

          // Get the correct query key from the generated API
          const providersQueryKey =
            getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey();

          await queryClient.cancelQueries({
            queryKey: providersQueryKey,
          });
          const previousData = queryClient.getQueryData(providersQueryKey);
          queryClient.setQueryData(
            providersQueryKey,
            (old: PermittedProviderResponseDto[]) => {
              return old.map((p) =>
                p.provider === data.provider ? { ...p, isPermitted: false } : p,
              );
            },
          );
          return { previousData, queryKey: providersQueryKey };
        },
        onSettled: () => {
          const providersQueryKey =
            getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey();
          const modelsQueryKey =
            getModelsControllerGetAvailableModelsWithConfigQueryKey();

          queryClient.invalidateQueries({
            queryKey: providersQueryKey,
          });
          queryClient.invalidateQueries({
            queryKey: modelsQueryKey,
          });
        },
        onError: (err, _, context) => {
          console.error("Error deleting permitted provider", err);
          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
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
