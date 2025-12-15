import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerCreateCustom,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateCustomIntegrationFormData } from '../model/types';
import extractErrorData from '@/shared/api/extract-error-data';

export function useCreateCustomIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  const mutation = useMcpIntegrationsControllerCreateCustom({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        toast.success(t('integrations.createCustomIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Create custom integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'INVALID_SERVER_URL':
              toast.error(
                t('integrations.createCustomIntegration.invalidServerUrl'),
              );
              break;
            case 'DUPLICATE_MCP_INTEGRATION':
              toast.error(
                t('integrations.createCustomIntegration.duplicateIntegration'),
              );
              break;
            default:
              toast.error(t('integrations.createCustomIntegration.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          toast.error(t('integrations.createCustomIntegration.error'));
        }
      },
    },
  });

  function createCustomIntegration(data: CreateCustomIntegrationFormData) {
    mutation.mutate({ data });
  }

  return {
    createCustomIntegration,
    isCreating: mutation.isPending,
  };
}
