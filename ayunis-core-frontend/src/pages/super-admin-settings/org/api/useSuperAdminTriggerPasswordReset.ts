import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';
import { superAdminUsersControllerTriggerPasswordReset } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseSuperAdminTriggerPasswordResetOptions {
  onSuccess?: (resetUrl: string) => void;
}

export function useSuperAdminTriggerPasswordReset(
  options?: UseSuperAdminTriggerPasswordResetOptions,
) {
  const { t } = useTranslation('super-admin-settings-org');

  return useMutation({
    mutationFn: async (userId: string) => {
      return superAdminUsersControllerTriggerPasswordReset(userId);
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data.resetUrl);
    },
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
  });
}
