import { useModelsControllerGetAllModelProviderInfosWithPermittedStatus } from '@/shared/api';

export function useProvidersWithPermittedStatus() {
  const {
    data: providers = [],
    isLoading,
    error,
    refetch,
  } = useModelsControllerGetAllModelProviderInfosWithPermittedStatus();

  return {
    providers: providers,
    isLoading,
    isError: !!error,
    error,
    refetch,
  };
}
