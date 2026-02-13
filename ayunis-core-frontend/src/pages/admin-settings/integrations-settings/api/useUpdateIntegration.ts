import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerUpdate,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateIntegrationFormData } from '../model/types';
import extractErrorData from '@/shared/api/extract-error-data';

export function useUpdateIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  const mutation = useMcpIntegrationsControllerUpdate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        showSuccess(t('integrations.updateIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Update integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MCP_INTEGRATION_NOT_FOUND':
              showError(t('integrations.updateIntegration.notFound'));
              break;
            case 'INVALID_SERVER_URL':
              showError(t('integrations.updateIntegration.invalidServerUrl'));
              break;
            default:
              showError(t('integrations.updateIntegration.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('integrations.updateIntegration.error'));
        }
      },
    },
  });

  function updateIntegration(id: string, data: UpdateIntegrationFormData) {
    mutation.mutate({ id, data });
  }

  return {
    updateIntegration,
    isUpdating: mutation.isPending,
  };
}
