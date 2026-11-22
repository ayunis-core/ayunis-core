import {
  useMcpIntegrationsControllerList,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useMcpIntegrationsQueries() {
  const {
    data: integrations = [],
    isLoading: isLoadingIntegrations,
    error: integrationsError,
    refetch: refetchIntegrations,
  } = useMcpIntegrationsControllerList({
    query: {
      refetchOnWindowFocus: true,
      staleTime: 30000,
      queryKey: getMcpIntegrationsControllerListQueryKey(),
    },
  });

  return {
    integrations,
    isLoadingIntegrations,
    integrationsError,
    refetchIntegrations,
  };
}
