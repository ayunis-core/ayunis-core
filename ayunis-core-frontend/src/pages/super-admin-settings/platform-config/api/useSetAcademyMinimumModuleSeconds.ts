import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSuperAdminPlatformConfigControllerGetAcademyMinimumModuleSecondsQueryKey,
  superAdminPlatformConfigControllerSetAcademyMinimumModuleSeconds,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export default function useSetAcademyMinimumModuleSeconds() {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seconds: number) =>
      superAdminPlatformConfigControllerSetAcademyMinimumModuleSeconds({
        seconds,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey:
          getSuperAdminPlatformConfigControllerGetAcademyMinimumModuleSecondsQueryKey(),
      });
      showSuccess(t('academyMinimumModuleSeconds.updateSuccess'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'PLATFORM_CONFIG_INVALID_VALUE'
              ? 'academyMinimumModuleSeconds.validationError'
              : 'academyMinimumModuleSeconds.updateError',
          ),
        );
      } catch {
        showError(t('academyMinimumModuleSeconds.updateError'));
      }
    },
  });
}
