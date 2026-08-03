import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerCreateCustom,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateCustomIntegrationFormData } from '../model/types';
import type { CreateCustomIntegrationDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import type { UseFormReturn } from 'react-hook-form';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';

export function useCreateCustomIntegration(
  form: UseFormReturn<CreateCustomIntegrationFormData>,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  const mutation = useMcpIntegrationsControllerCreateCustom({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        showSuccess(t('integrations.createCustomIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'integrations.validation');
            return;
          }
          switch (code) {
            case 'INVALID_SERVER_URL':
              showError(
                t('integrations.createCustomIntegration.invalidServerUrl'),
              );
              break;
            case 'DUPLICATE_MCP_INTEGRATION':
              showError(
                t('integrations.createCustomIntegration.duplicateIntegration'),
              );
              break;
            default:
              showError(t('integrations.createCustomIntegration.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('integrations.createCustomIntegration.error'));
        }
      },
    },
  });

  function createCustomIntegration(data: CreateCustomIntegrationDto) {
    mutation.mutate({ data });
  }

  return {
    createCustomIntegration,
    isCreating: mutation.isPending,
  };
}
