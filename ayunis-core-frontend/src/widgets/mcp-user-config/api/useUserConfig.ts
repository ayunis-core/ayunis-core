import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import type { UserConfigResponseDto } from '@ayunis/api-client/schemas';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerGetUserConfig,
  useMcpIntegrationsControllerSetUserConfig,
  useMcpIntegrationsControllerDeleteUserConfig,
  getMcpIntegrationsControllerGetUserConfigQueryKey,
  getMcpIntegrationsControllerListAvailableQueryKey,
} from '@ayunis/api-client/endpoints';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

export function useGetUserConfig(integrationId: string) {
  const { data, isLoading } =
    useMcpIntegrationsControllerGetUserConfig(integrationId);

  return {
    userConfig: data,
    isLoadingUserConfig: isLoading,
  };
}

export function useSetUserConfig(
  integrationId: string,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('mcp-user-config');
  const queryClient = useQueryClient();

  const mutation = useMcpIntegrationsControllerSetUserConfig({
    mutation: {
      onSuccess: async (config) => {
        await cacheUserConfig(queryClient, integrationId, config);
        // Refresh the available list so per-user authorization status badges update.
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
        });
        showSuccess(t('success'));
        onSuccess?.();
      },
      onError: (error) => showError(t(userConfigErrorKey(error))),
    },
  });

  function setUserConfig(configValues: Record<string, string>) {
    mutation.mutate({ id: integrationId, data: { configValues } });
  }

  return {
    setUserConfig,
    isSaving: mutation.isPending,
  };
}

export function useDeleteUserConfig(
  integrationId: string,
  onSuccess: () => void,
) {
  const { t } = useTranslation('mcp-user-config');
  const queryClient = useQueryClient();
  const mutation = useMcpIntegrationsControllerDeleteUserConfig({
    mutation: {
      onSuccess: async () => {
        await cacheUserConfig(queryClient, integrationId, {
          hasConfig: false,
          configValues: {},
        });
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
        });
        showSuccess(t('disconnected'));
        onSuccess();
      },
      onError: (error) => showError(t(userConfigErrorKey(error))),
    },
  });
  return {
    disconnect: () => mutation.mutate({ id: integrationId }),
    isDisconnecting: mutation.isPending,
  };
}

async function cacheUserConfig(
  queryClient: QueryClient,
  integrationId: string,
  config: UserConfigResponseDto,
): Promise<void> {
  const queryKey =
    getMcpIntegrationsControllerGetUserConfigQueryKey(integrationId);
  // A read started before the mutation must not restore the old configuration.
  await queryClient.cancelQueries({ queryKey, exact: true });
  queryClient.setQueryData(queryKey, config);
}

function userConfigErrorKey(error: unknown): string {
  try {
    const { code } = extractErrorData(error);
    const keys: Record<string, string> = {
      MCP_INTEGRATION_NOT_FOUND: 'notFound',
      MCP_CREDENTIALS_REJECTED: 'verification.rejected',
      MCP_CREDENTIALS_FORBIDDEN: 'verification.forbidden',
      MCP_VERIFICATION_TIMEOUT: 'verification.timeout',
      MCP_VERIFICATION_UNAVAILABLE: 'verification.unavailable',
      MCP_VERIFICATION_INVALID_RESPONSE: 'verification.invalidResponse',
      MCP_CONFIG_CHANGED: 'verification.changed',
      MCP_MISSING_REQUIRED_CONFIG: 'verification.required',
    };
    return keys[code] ?? 'error';
  } catch {
    return 'error';
  }
}
