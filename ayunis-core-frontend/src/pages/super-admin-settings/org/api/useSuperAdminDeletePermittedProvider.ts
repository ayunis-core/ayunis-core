import {
  useSuperAdminModelsControllerDeletePermittedProvider,
  type DeletePermittedProviderDto,
  type ModelProviderWithPermittedStatusResponseDto,
  getSuperAdminModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey,
} from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export function useSuperAdminDeletePermittedProvider(orgId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const deletePermittedProviderMutation =
    useSuperAdminModelsControllerDeletePermittedProvider({
      mutation: {
        onMutate: async ({ data }) => {
          const queryKey =
            getSuperAdminModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey(
              orgId,
            );
          await queryClient.cancelQueries({
            queryKey,
          });
          const previousData =
            queryClient.getQueryData<
              ModelProviderWithPermittedStatusResponseDto[]
            >(queryKey);

          // Optimistically update to the new value
          queryClient.setQueryData<
            ModelProviderWithPermittedStatusResponseDto[]
          >(queryKey, (old) => {
            if (!old) {
              return old;
            }
            return old.map((provider) => {
              if (provider.provider === data.provider) {
                return {
                  ...provider,
                  isPermitted: false,
                };
              }
              return provider;
            });
          });

          return { previousData, queryKey };
        },
        onSettled: () => {
          // Invalidate queries by partial key until API is regenerated
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                Array.isArray(key) &&
                key.length > 0 &&
                typeof key[0] === "string" &&
                key[0].includes("superAdminModels") &&
                key[0].includes("permitted")
              );
            },
          });
          router.invalidate();
        },
        onError: (err, _, context) => {
          console.error("Error deleting permitted provider", err);

          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
        },
      },
    });

  function deletePermittedProvider(data: DeletePermittedProviderDto) {
    deletePermittedProviderMutation.mutate({
      orgId,
      data,
    });
  }

  return {
    deletePermittedProvider,
    isLoading: deletePermittedProviderMutation.isPending,
    isError: deletePermittedProviderMutation.isError,
    error: deletePermittedProviderMutation.error,
  };
}
