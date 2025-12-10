import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
        toast.success(t('integrations.deleteIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Delete integration failed:', error);
        const { code } = extractErrorData(error);
        switch (code) {
          case 'MCP_INTEGRATION_NOT_FOUND':
            toast.error(t('integrations.deleteIntegration.notFound'));
            break;
          default:
            toast.error(t('integrations.deleteIntegration.error'));
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
