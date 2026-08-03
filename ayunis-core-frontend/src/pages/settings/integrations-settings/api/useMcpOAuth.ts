import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getMcpIntegrationsControllerListAvailableQueryKey,
  mcpIntegrationsControllerAuthorizeOAuth,
  mcpIntegrationsControllerDisconnectOAuth,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useAuthorizeMcpOAuth() {
  const { t } = useTranslation('settings');
  return useMutation({
    mutationFn: (id: string) => mcpIntegrationsControllerAuthorizeOAuth(id),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'MCP_INTEGRATION_NOT_FOUND') {
          showError(t('integrations.oauth.notFound'));
          return;
        }
        showError(t('integrations.oauth.connectError'));
      } catch {
        showError(t('integrations.oauth.connectError'));
      }
    },
  });
}

export function useDisconnectMcpOAuth() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mcpIntegrationsControllerDisconnectOAuth,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
      });
      showSuccess(t('integrations.oauth.disconnectSuccess'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'MCP_INTEGRATION_NOT_FOUND') {
          showError(t('integrations.oauth.notFound'));
          return;
        }
        showError(t('integrations.oauth.disconnectError'));
      } catch {
        showError(t('integrations.oauth.disconnectError'));
      }
    },
  });
}
