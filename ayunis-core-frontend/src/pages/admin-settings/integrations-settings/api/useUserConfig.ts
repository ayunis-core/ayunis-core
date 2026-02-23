import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerGetUserConfig,
  useMcpIntegrationsControllerSetUserConfig,
  getMcpIntegrationsControllerGetUserConfigQueryKey,
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
  const { t } = useTranslation('admin-settings-integrations');
  const queryClient = useQueryClient();

  const mutation = useMcpIntegrationsControllerSetUserConfig({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getMcpIntegrationsControllerGetUserConfigQueryKey(integrationId),
        });
        showSuccess(t('integrations.userConfig.success'));
        onSuccess?.();
      },
      onError: () => {
        showError(t('integrations.userConfig.error'));
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
