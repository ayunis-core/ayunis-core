import { useMcpIntegrationsControllerListAvailable } from '@/shared/api/generated/ayunisCoreAPI';

export function useAvailableIntegrations() {
  const { data, error } = useMcpIntegrationsControllerListAvailable();

  return { integrations: data, error };
}
