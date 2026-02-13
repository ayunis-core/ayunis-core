import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
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
        showSuccess(t('integrations.createPredefinedIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Create predefined integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'INVALID_PREDEFINED_SLUG':
              showError(
                t('integrations.createPredefinedIntegration.invalidSlug'),
              );
              break;
            case 'DUPLICATE_MCP_INTEGRATION':
              showError(
                t(
                  'integrations.createPredefinedIntegration.duplicateIntegration',
                ),
              );
              break;
            default:
              showError(t('integrations.createPredefinedIntegration.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('integrations.createPredefinedIntegration.error'));
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
