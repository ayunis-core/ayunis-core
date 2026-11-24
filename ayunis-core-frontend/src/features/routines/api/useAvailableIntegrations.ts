import { useMcpIntegrationsControllerListAvailable } from '@ayunis/api-client/endpoints';

export function useAvailableIntegrations() {
  const { data, error } = useMcpIntegrationsControllerListAvailable();

  return { integrations: data, error };
}
