import {
  useModelsControllerCreatePermittedProvider,
  type PermittedProviderResponseDto,
  type CreatePermittedProviderDto,
  getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
} from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";

export function useCreatePermittedProvider() {
  const queryClient = useQueryClient();
  const createPermittedProviderMutation =
    useModelsControllerCreatePermittedProvider({
      mutation: {
        onMutate: async ({ data }) => {
          console.log("Creating permitted provider");

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
              if (!old) return [data];
              return [...old, data];
            },
          );
          return { previousData, queryKey: providersQueryKey };
        },
        onSuccess: () => {
          // Get the correct query keys from the generated API
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
          console.error("Error creating permitted provider", err);
          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
        },
      },
    });

  function createPermittedProvider(provider: CreatePermittedProviderDto) {
    console.log("Creating permitted provider", provider);
    createPermittedProviderMutation.mutate(
      {
        data: provider,
      },
      {},
    );
  }

  return {
    createPermittedProvider,
    isLoading: createPermittedProviderMutation.isPending,
    isError: createPermittedProviderMutation.isError,
    error: createPermittedProviderMutation.error,
  };
}
