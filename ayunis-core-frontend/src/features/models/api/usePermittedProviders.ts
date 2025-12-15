import { useModelsControllerGetAllPermittedProviders } from '@/shared/api';

export function usePermittedProviders() {
  const {
    data: providers = [],
    isLoading,
    error,
    refetch,
  } = useModelsControllerGetAllPermittedProviders();

  return {
    providers,
    isLoading,
    isError: !!error,
    error,
    refetch,
  };
}
