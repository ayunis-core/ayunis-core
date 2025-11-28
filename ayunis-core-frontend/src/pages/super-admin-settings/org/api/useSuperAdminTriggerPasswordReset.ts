import { useSuperAdminUsersControllerTriggerPasswordReset } from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

interface UseSuperAdminTriggerPasswordResetOptions {
  onSuccessCallback?: () => void;
}

export function useSuperAdminTriggerPasswordReset(
  options?: UseSuperAdminTriggerPasswordResetOptions,
) {
  const { t } = useTranslation('super-admin-settings-org');
  const triggerPasswordResetMutation =
    useSuperAdminUsersControllerTriggerPasswordReset({
      mutation: {
        onSuccess: () => {
          console.log('Password reset email sent successfully');
          showSuccess(t('triggerPasswordReset.success'));
          if (options?.onSuccessCallback) {
            options.onSuccessCallback();
          }
        },
        onError: (err) => {
          console.error('Error triggering password reset', err);
          showError(t('triggerPasswordReset.error'));
        },
      },
    });

  function triggerPasswordReset(userId: string) {
    triggerPasswordResetMutation.mutate({ userId });
  }

  return {
    triggerPasswordReset,
    isLoading: triggerPasswordResetMutation.isPending,
    isError: triggerPasswordResetMutation.isError,
    error: triggerPasswordResetMutation.error,
  };
}
