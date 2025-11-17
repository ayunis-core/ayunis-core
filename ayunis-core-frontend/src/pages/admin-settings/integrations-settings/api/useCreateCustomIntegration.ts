import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerCreateCustom,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateCustomIntegrationFormData } from '../model/types';

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
          t('integrations.createCustomIntegration.error', {
            message: errorMessage,
          }),
        );
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
