import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerCreatePredefined,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreatePredefinedIntegrationFormData } from '../model/types';

export function useCreatePredefinedIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  const mutation = useMcpIntegrationsControllerCreatePredefined({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        toast.success(t('integrations.createPredefinedIntegration.success'));
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
          t('integrations.createPredefinedIntegration.error', {
            message: errorMessage,
          }),
        );
      },
    },
  });

  function createPredefinedIntegration(
    data: CreatePredefinedIntegrationFormData,
  ) {
    const payload: CreatePredefinedIntegrationFormData = {
      slug: data.slug,
      configValues: (data.configValues ?? []).map((value) => ({
        name: value.name,
        value: value.value?.trim() ?? '',
      })),
    };

    mutation.mutate({ data: payload });
  }

  return {
    createPredefinedIntegration,
    isCreating: mutation.isPending,
  };
}
