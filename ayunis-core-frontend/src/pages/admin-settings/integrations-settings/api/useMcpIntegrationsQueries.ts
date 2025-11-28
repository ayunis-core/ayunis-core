import {
  useMcpIntegrationsControllerList,
  useMcpIntegrationsControllerListPredefinedConfigs,
  getMcpIntegrationsControllerListQueryKey,
  getMcpIntegrationsControllerListPredefinedConfigsQueryKey,
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

  const { data: predefinedConfigs = [] } =
    useMcpIntegrationsControllerListPredefinedConfigs({
      query: {
        staleTime: 300000, // 5 minutes
        queryKey: getMcpIntegrationsControllerListPredefinedConfigsQueryKey(),
      },
    });

  return {
    integrations,
    isLoadingIntegrations,
    integrationsError,
    refetchIntegrations,
    predefinedConfigs,
  };
}
