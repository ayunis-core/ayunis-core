import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getMcpIntegrationsControllerGetOAuthStatusQueryKey,
  getMcpIntegrationsControllerListQueryKey,
  useMcpIntegrationsControllerRevokeOAuth,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRevokeOAuthAuthorization() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  return useMcpIntegrationsControllerRevokeOAuth({
    mutation: {
      onSuccess: (_, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerGetOAuthStatusQueryKey(
            variables.id,
          ),
        });
        showSuccess(t('integrations.oauth.revokeSuccess'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'MCP_INTEGRATION_NOT_FOUND') {
            showError(t('integrations.oauth.errorIntegrationNotFound'));
          } else {
            showError(t('integrations.oauth.revokeError'));
          }
        } catch {
          showError(t('integrations.oauth.revokeError'));
        }
      },
    },
  });
}
