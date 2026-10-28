import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  getCreditLimitsControllerGetApiKeyLimitsQueryKey,
  useCreditLimitsControllerSetApiKeyLimit,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { ApiKeyCreditLimitFormValues } from '@/pages/admin-settings/api-keys-settings/model/types';

export function useSetApiKeyCreditLimit(
  form: UseFormReturn<ApiKeyCreditLimitFormValues>,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-api-keys');

  const mutation = useCreditLimitsControllerSetApiKeyLimit({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getCreditLimitsControllerGetApiKeyLimitsQueryKey(),
        });
        void router.invalidate();
        showSuccess(t('apiKeys.creditLimit.setSuccess'));
        onSuccess?.();
      },
      onError: (error) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(
              form,
              errors,
              t,
              'apiKeys.creditLimit.validation',
            );
          } else if (code === 'CREDIT_LIMIT_TARGET_NOT_FOUND') {
            showError(t('apiKeys.creditLimit.notFound'));
          } else if (code === 'INVALID_CREDIT_LIMIT') {
            showError(t('apiKeys.creditLimit.invalid'));
          } else {
            showError(t('apiKeys.creditLimit.setError'));
          }
        } catch {
          showError(t('apiKeys.creditLimit.setError'));
        }
      },
    },
  });

  return {
    setApiKeyCreditLimit: (apiKeyId: string, monthlyCredits: number) =>
      mutation.mutate({ apiKeyId, data: { monthlyCredits } }),
    isSaving: mutation.isPending,
  };
}
