import {
  useModelsControllerCreatePermittedProvider,
  type PermittedProviderResponseDto,
  type CreatePermittedProviderDto,
  getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey,
  getModelsControllerGetAvailableModelsWithConfigQueryKey,
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';

export function useCreatePermittedProvider() {
  const { t } = useTranslation('admin-settings-models');
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
          console.error('Error creating permitted provider', err);
          showError(t('models.createPermittedProvider.error'));
          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
        },
        onSettled: () => {
          const queryKeys = [
            getModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey(),
            getModelsControllerGetAvailableModelsWithConfigQueryKey(),
            getModelsControllerGetPermittedLanguageModelsQueryKey(),
            getModelsControllerGetUserSpecificDefaultModelQueryKey(),
          ];

          queryKeys.forEach((queryKey) => {
            void queryClient.invalidateQueries({
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
