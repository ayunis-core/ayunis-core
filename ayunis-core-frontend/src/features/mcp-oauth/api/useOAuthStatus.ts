import {
  getMcpIntegrationsControllerGetOAuthStatusQueryKey,
  useMcpIntegrationsControllerGetOAuthStatus,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useOAuthStatus(integrationId: string) {
  const { data, isLoading, error, refetch } =
    useMcpIntegrationsControllerGetOAuthStatus(integrationId, {
      query: {
        enabled: Boolean(integrationId),
        queryKey:
          getMcpIntegrationsControllerGetOAuthStatusQueryKey(integrationId),
      },
    });

  return {
    oauthStatus: data,
    isLoading,
    error,
    refetch,
  };
}
