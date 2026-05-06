import { useUserControllerTriggerPasswordResetForUser } from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

interface UseTriggerPasswordResetOptions {
  onSuccessCallback?: () => void;
}

export function useTriggerPasswordReset(
  options?: UseTriggerPasswordResetOptions,
) {
  const { t } = useTranslation('admin-settings-users');

  const mutation = useUserControllerTriggerPasswordResetForUser({
    mutation: {
      onSuccess: () => {
        showSuccess(t('triggerActivation.success'));
        options?.onSuccessCallback?.();
      },
      onError: (err) => {
        console.error('Error triggering activation email', err);
        showError(t('triggerActivation.error'));
      },
    },
  });

  function triggerPasswordReset(userId: string) {
    mutation.mutate({ id: userId });
  }

  return {
    triggerPasswordReset,
    isLoading: mutation.isPending,
  };
}
