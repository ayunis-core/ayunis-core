import {
  getMcpIntegrationsControllerGetUserConfigQueryKey,
  useMcpIntegrationsControllerGetUserConfig,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useGetUserConfig(integrationId: string) {
  const { data, isLoading, error, refetch } =
    useMcpIntegrationsControllerGetUserConfig(integrationId, {
      query: {
        enabled: Boolean(integrationId),
        queryKey:
          getMcpIntegrationsControllerGetUserConfigQueryKey(integrationId),
      },
    });

  return {
    userConfig: data,
    isLoadingUserConfig: isLoading,
    error,
    refetch,
  };
}
