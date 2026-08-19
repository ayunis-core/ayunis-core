import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import { useSuperAdminUsersControllerTriggerPasswordReset } from '@/shared/api/generated/ayunisCoreAPI';
import { showError } from '@/shared/lib/toast';

interface UseSuperAdminTriggerPasswordResetOptions {
  onSuccess: (resetUrl: string) => void;
}

export function useSuperAdminTriggerPasswordReset(
  options: UseSuperAdminTriggerPasswordResetOptions,
) {
  const { t } = useTranslation('super-admin-settings-org');

  return useSuperAdminUsersControllerTriggerPasswordReset({
    mutation: {
      onSuccess: (data) => options.onSuccess(data.resetUrl),
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'USER_NOT_FOUND') {
            showError(t('triggerPasswordReset.notFound'));
          } else {
            showError(t('triggerPasswordReset.error'));
          }
        } catch {
          showError(t('triggerPasswordReset.error'));
        }
      },
    },
  });
}
