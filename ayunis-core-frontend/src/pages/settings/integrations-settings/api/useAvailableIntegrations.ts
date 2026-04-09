import {
  getMcpIntegrationsControllerListAvailableQueryKey,
  useMcpIntegrationsControllerListAvailable,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useAvailableIntegrations() {
  const {
    data: availableIntegrations = [],
    isLoading,
    error,
    refetch,
  } = useMcpIntegrationsControllerListAvailable({
    query: {
      queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
      refetchOnWindowFocus: true,
      staleTime: 30000,
    },
  });

  return {
    availableIntegrations,
    isLoading,
    error,
    refetch,
  };
}
