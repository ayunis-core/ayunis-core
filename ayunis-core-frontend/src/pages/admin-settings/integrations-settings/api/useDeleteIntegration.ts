import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerDelete,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  const mutation = useMcpIntegrationsControllerDelete({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        showSuccess(t('integrations.deleteIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Delete integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'MCP_INTEGRATION_NOT_FOUND') {
            showError(t('integrations.deleteIntegration.notFound'));
          } else {
            showError(t('integrations.deleteIntegration.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('integrations.deleteIntegration.error'));
        }
      },
    },
  });

  function deleteIntegration(id: string) {
    mutation.mutate({ id });
  }

  return {
    deleteIntegration,
    isDeleting: mutation.isPending,
  };
}
