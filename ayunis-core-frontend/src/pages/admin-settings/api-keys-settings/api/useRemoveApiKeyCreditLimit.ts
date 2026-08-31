import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getCreditLimitsControllerGetApiKeyLimitsQueryKey,
  useCreditLimitsControllerRemoveApiKeyLimit,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRemoveApiKeyCreditLimit(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-api-keys');

  const mutation = useCreditLimitsControllerRemoveApiKeyLimit({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getCreditLimitsControllerGetApiKeyLimitsQueryKey(),
        });
        void router.invalidate();
        showSuccess(t('apiKeys.creditLimit.removeSuccess'));
        onSuccess?.();
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'CREDIT_LIMIT_NOT_FOUND') {
            showError(t('apiKeys.creditLimit.notFound'));
          } else {
            showError(t('apiKeys.creditLimit.removeError'));
          }
        } catch {
          showError(t('apiKeys.creditLimit.removeError'));
        }
      },
    },
  });

  return {
    removeApiKeyCreditLimit: (apiKeyId: string) =>
      mutation.mutate({ apiKeyId }),
    isRemoving: mutation.isPending,
  };
}
