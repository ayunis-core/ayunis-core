import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerInstallFromMarketplace,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useInstallIntegrationFromMarketplace() {
  const { t } = useTranslation('install-integration');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMcpIntegrationsControllerInstallFromMarketplace({
    mutation: {
      onSuccess: () => {
        showSuccess(t('success'));
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        void router.navigate({
          to: '/admin-settings/integrations',
        });
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MARKETPLACE_INTEGRATION_NOT_FOUND':
              showError(t('error.notFound.description'));
              break;
            case 'MARKETPLACE_UNAVAILABLE':
              showError(t('error.unavailable'));
              break;
            case 'MCP_OAUTH_NOT_SUPPORTED':
              showError(t('error.oauthNotSupported'));
              break;
            case 'MCP_MISSING_REQUIRED_CONFIG':
              showError(t('error.missingRequiredConfig'));
              break;
            default:
              showError(t('error.generic'));
          }
        } catch {
          showError(t('error.generic'));
        }
      },
    },
  });
}
