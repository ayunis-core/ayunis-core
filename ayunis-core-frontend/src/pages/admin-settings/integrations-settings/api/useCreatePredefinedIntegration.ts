import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerCreatePredefined,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreatePredefinedIntegrationFormData } from '../model/types';
import extractErrorData from '@/shared/api/extract-error-data';

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
        console.error('Create predefined integration failed:', error);
        const { code } = extractErrorData(error);
        switch (code) {
          case 'INVALID_PREDEFINED_SLUG':
            toast.error(t('integrations.createPredefinedIntegration.invalidSlug'));
            break;
          case 'DUPLICATE_MCP_INTEGRATION':
            toast.error(t('integrations.createPredefinedIntegration.duplicateIntegration'));
            break;
          default:
            toast.error(t('integrations.createPredefinedIntegration.error'));
        }
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
