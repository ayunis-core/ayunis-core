import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  useApiKeysControllerCreateApiKey,
  getApiKeysControllerListApiKeysQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateApiKeyResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useCreateApiKey(
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
        console.error('Create API key failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'API_KEY_EXPIRATION_IN_PAST') {
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
