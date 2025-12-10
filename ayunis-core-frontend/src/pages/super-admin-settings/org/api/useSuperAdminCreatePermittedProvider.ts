import {
  useSuperAdminModelsControllerCreatePermittedProvider,
  type CreatePermittedProviderDto,
  type ModelProviderWithPermittedStatusResponseDto,
  getSuperAdminModelsControllerGetAllModelProviderInfosWithPermittedStatusQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';

export function useSuperAdminCreatePermittedProvider(orgId: string) {
  const { t } = useTranslation('admin-settings-models');
  const queryClient = useQueryClient();
  const router = useRouter();
  const createPermittedProviderMutation =
    useSuperAdminModelsControllerCreatePermittedProvider({
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
                  isPermitted: true,
                };
              }
              return provider;
            });
          });

          return { previousData, queryKey };
        },
        onSettled: () => {
          // Invalidate queries by partial key until API is regenerated
          void queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                Array.isArray(key) &&
                key.length > 0 &&
                typeof key[0] === 'string' &&
                key[0].includes('superAdminModels') &&
                key[0].includes('permitted')
              );
            },
          });
          void router.invalidate();
        },
        onError: (err, _, context) => {
          console.error('Error creating permitted provider', err);
          showError(t('models.createPermittedProvider.error'));

          if (context?.previousData && context?.queryKey) {
            queryClient.setQueryData(context.queryKey, context.previousData);
          }
        },
      },
    });

  function createPermittedProvider(data: CreatePermittedProviderDto) {
    createPermittedProviderMutation.mutate({
      orgId,
      data,
    });
  }

  return {
    createPermittedProvider,
    isLoading: createPermittedProviderMutation.isPending,
    isError: createPermittedProviderMutation.isError,
    error: createPermittedProviderMutation.error,
  };
}
