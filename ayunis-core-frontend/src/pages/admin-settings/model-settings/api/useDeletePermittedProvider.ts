import {
  useModelsControllerDeletePermittedProvider,
  type PermittedProviderResponseDto,
  type DeletePermittedProviderDto,
  getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';

export function useDeletePermittedProvider() {
  const queryClient = useQueryClient();
  const deletePermittedProviderMutation =
    useModelsControllerDeletePermittedProvider({
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
              return old.map((p) =>
                p.provider === data.provider ? { ...p, isPermitted: false } : p,
              );
            },
          );
          return { previousData, queryKey };
        },
        onError: (err, _, context) => {
          console.error('Error deleting permitted provider', err);
          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
        },
        onSettled: () => {
          const queryKeys = [
            getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey(),
            getModelsControllerGetAvailableModelsWithConfigQueryKey(),
            getModelsControllerGetUserSpecificDefaultModelQueryKey(),
            getModelsControllerGetPermittedLanguageModelsQueryKey(),
            getAgentsControllerFindAllQueryKey(),
          ];
          queryKeys.forEach((queryKey) => {
            void queryClient.invalidateQueries({
              queryKey,
            });
          });
        },
      },
    });

  function deletePermittedProvider(provider: DeletePermittedProviderDto) {
    console.log('Deleting permitted provider', provider);
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
