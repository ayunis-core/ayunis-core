import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import type { UseFormReturn } from 'react-hook-form';
import {
  useApiKeysControllerCreateApiKey,
  getApiKeysControllerListApiKeysQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateApiKeyResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { CreateApiKeyFormValues } from '../model/createApiKeyFormSchema';

export function useCreateApiKey(
  form: UseFormReturn<CreateApiKeyFormValues>,
  onSuccess?: (response: CreateApiKeyResponseDto) => void,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-api-keys');

  const mutation = useApiKeysControllerCreateApiKey({
    mutation: {
      onSuccess: (response) => {
        showSuccess(t('apiKeys.createApiKey.success'));
        onSuccess?.(response);
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'validation');
          } else if (code === 'API_KEY_EXPIRATION_IN_PAST') {
            showError(t('apiKeys.createApiKey.expirationInPast'));
          } else {
            showError(t('apiKeys.createApiKey.error'));
          }
        } catch {
          showError(t('apiKeys.createApiKey.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getApiKeysControllerListApiKeysQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  function createApiKey(data: { name: string; expiresAt?: string }) {
    mutation.mutate({
      data: {
        name: data.name.trim(),
        ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
      },
    });
  }

  return {
    createApiKey,
    isCreating: mutation.isPending,
  };
}
