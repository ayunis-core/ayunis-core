import type { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerInstallFromMarketplace,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';
import { trackProbedIntegrationConnection } from '@/shared/lib/openpanel-integrations';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { InstallIntegrationFormFields } from '@/pages/install/model/types';

export function useInstallIntegrationFromMarketplace(
  form: UseFormReturn<InstallIntegrationFormFields>,
) {
  const { t } = useTranslation('install-integration');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMcpIntegrationsControllerInstallFromMarketplace({
    mutation: {
      onSuccess: (integration, { data }) => {
        trackOpenPanelEvent('integration_installed', {
          marketplace_slug: data.identifier,
        });
        trackProbedIntegrationConnection(integration);
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
          const { code, errors } = extractErrorData(error);
          if (
            code === 'INVALID_SERVER_URL' ||
            (code === 'VALIDATION_ERROR' &&
              errors?.some(({ field }) => field === 'serverUrl'))
          ) {
            form.setError('serverUrl', { message: t('serverUrl.invalid') });
            return;
          }
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
            case 'DUPLICATE_MCP_INTEGRATION':
              showError(t('error.alreadyInstalled'));
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
