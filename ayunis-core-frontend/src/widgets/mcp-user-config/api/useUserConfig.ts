import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerGetUserConfig,
  useMcpIntegrationsControllerSetUserConfig,
  getMcpIntegrationsControllerGetUserConfigQueryKey,
  getMcpIntegrationsControllerListAvailableQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

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
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getMcpIntegrationsControllerGetUserConfigQueryKey(integrationId),
        });
        // Refresh the available list so per-user authorization status badges update.
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
        });
        showSuccess(t('success'));
        onSuccess?.();
      },
      onError: () => {
        showError(t('error'));
      },
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
