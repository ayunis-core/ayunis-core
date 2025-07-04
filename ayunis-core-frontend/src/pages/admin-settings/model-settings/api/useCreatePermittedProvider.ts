import {
  useModelsControllerCreatePermittedProvider,
  type PermittedProviderResponseDto,
  type CreatePermittedProviderDto,
} from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";

export function useCreatePermittedProvider() {
  const queryClient = useQueryClient();
  const createPermittedProviderMutation =
    useModelsControllerCreatePermittedProvider({
      mutation: {
        onMutate: async ({ data }) => {
          console.log("Creating permitted provider");
          await queryClient.cancelQueries({
            queryKey: ["permitted-providers"],
          });
          const previousData = queryClient.getQueryData([
            "permitted-providers",
          ]);
          queryClient.setQueryData(
            ["permitted-providers"],
            (old: PermittedProviderResponseDto[]) => {
              if (!old) return [data];
              return [...old, data];
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
          console.error("Error creating permitted provider", err);
          queryClient.setQueryData(
            ["permitted-providers"],
            context?.previousData,
          );
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
