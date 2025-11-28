import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerUpdate,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateIntegrationFormData } from '../model/types';

export function useUpdateIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  const mutation = useMcpIntegrationsControllerUpdate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        toast.success(t('integrations.updateIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        const errorMessage =
          (
            error as {
              response?: { data?: { message?: string } };
              message?: string;
            }
          )?.response?.data?.message ||
          (error as { message?: string })?.message ||
          'Unknown error';
        toast.error(
          t('integrations.updateIntegration.error', {
            message: errorMessage,
          }),
        );
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
