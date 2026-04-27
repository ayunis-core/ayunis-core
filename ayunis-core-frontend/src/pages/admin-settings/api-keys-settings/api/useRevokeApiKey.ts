import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import {
  useApiKeysControllerRevokeApiKey,
  getApiKeysControllerListApiKeysQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useConfirmation } from '@/widgets/confirmation-modal';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-api-keys');
  const { confirm } = useConfirmation();

  const mutation = useApiKeysControllerRevokeApiKey({
    mutation: {
      onSuccess: () => {
        showSuccess(t('apiKeys.revokeApiKey.success'));
      },
      onError: (error: unknown) => {
        console.error('Revoke API key failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'API_KEY_NOT_FOUND') {
            showError(t('apiKeys.revokeApiKey.notFound'));
          } else {
            showError(t('apiKeys.revokeApiKey.error'));
          }
        } catch {
          showError(t('apiKeys.revokeApiKey.error'));
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

  function revokeApiKey(id: string, name: string) {
    confirm({
      title: t('apiKeys.revokeApiKey.title'),
      description: t('apiKeys.revokeApiKey.description', { name }),
      confirmText: t('apiKeys.revokeApiKey.confirmText'),
      cancelText: t('apiKeys.revokeApiKey.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        mutation.mutate({ id });
      },
    });
  }

  return {
    revokeApiKey,
    isRevoking: mutation.isPending,
  };
}
