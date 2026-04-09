import { useMcpIntegrationsControllerStartOAuthAuthorize } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useStartOAuthAuthorization() {
  const { t } = useTranslation('admin-settings-integrations');

  return useMcpIntegrationsControllerStartOAuthAuthorize({
    mutation: {
      onSuccess: (response) => {
        window.location.assign(response.authorizationUrl);
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MCP_OAUTH_CLIENT_NOT_CONFIGURED':
              showError(t('integrations.oauth.errorClientNotConfigured'));
              break;
            case 'MCP_INTEGRATION_NOT_FOUND':
              showError(t('integrations.oauth.errorIntegrationNotFound'));
              break;
            default:
              showError(t('integrations.oauth.errorToast'));
          }
        } catch {
          showError(t('integrations.oauth.errorToast'));
        }
      },
    },
  });
}
