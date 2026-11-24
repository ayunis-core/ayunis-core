import {
  useMcpIntegrationsControllerList,
  getMcpIntegrationsControllerListQueryKey,
} from '@ayunis/api-client/endpoints';

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
