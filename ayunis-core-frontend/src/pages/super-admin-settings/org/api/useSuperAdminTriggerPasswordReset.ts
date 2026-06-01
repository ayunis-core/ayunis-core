import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import { useSuperAdminUsersControllerTriggerPasswordReset } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseSuperAdminTriggerPasswordResetOptions {
  onSuccess?: (resetUrl: string) => void;
}

export function useSuperAdminTriggerPasswordReset(
  options?: UseSuperAdminTriggerPasswordResetOptions,
) {
  const { t } = useTranslation('super-admin-settings-org');

  return useSuperAdminUsersControllerTriggerPasswordReset({
    mutation: {
      onSuccess: (data) => {
        options?.onSuccess?.(data.resetUrl);
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'USER_NOT_FOUND') {
            showError(t('triggerActivation.notFound'));
          } else {
            showError(t('triggerActivation.error'));
          }
        } catch {
          showError(t('triggerActivation.error'));
        }
      },
    },
  });
}
