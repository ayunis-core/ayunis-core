import {
  useModelsControllerCreatePermittedProvider,
  type PermittedProviderResponseDto,
  type CreatePermittedProviderDto,
  getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedModelsQueryKey,
} from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";

export function useCreatePermittedProvider() {
  const queryClient = useQueryClient();
  const createPermittedProviderMutation =
    useModelsControllerCreatePermittedProvider({
      mutation: {
        onMutate: async ({ data }) => {
          const queryKey =
            getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey();
          await queryClient.cancelQueries({
            queryKey,
          });
          const previousData = queryClient.getQueryData(queryKey);
          queryClient.setQueryData(
            queryKey,
            (old: PermittedProviderResponseDto[]) => {
              if (!old) return [data];
              return [...old, data];
            },
          );
          return { previousData, queryKey };
        },
        onError: (err, _, context) => {
          console.error("Error creating permitted provider", err);
          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
        },
        onSettled: () => {
          const queryKeys = [
            getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey(),
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

  function createPermittedProvider(provider: CreatePermittedProviderDto) {
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
