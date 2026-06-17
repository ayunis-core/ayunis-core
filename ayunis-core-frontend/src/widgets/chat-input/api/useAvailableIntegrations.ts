import { useMcpIntegrationsControllerListAvailable } from '@/shared/api/generated/ayunisCoreAPI';

interface UseAvailableIntegrationsOptions {
  enabled?: boolean;
}

export function useAvailableIntegrations(
  options: UseAvailableIntegrationsOptions = {},
) {
  const { enabled = true } = options;
  const { data, isLoading, error } = useMcpIntegrationsControllerListAvailable({
    query: {
      enabled,
    },
  });

  return {
    integrations: data ?? [],
    isLoading,
    error,
  };
}
