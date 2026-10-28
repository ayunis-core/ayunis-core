import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  getUserControllerGetUsersInOrganizationQueryKey,
  useAdminUserAccountLockControllerUnlock,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useAdminUnlockUserAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('common', { keyPrefix: 'accountLock' });

  return useAdminUserAccountLockControllerUnlock({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getUserControllerGetUsersInOrganizationQueryKey(),
        });
        await router.invalidate();
        showSuccess(t('unlock.success'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            t(code === 'USER_NOT_FOUND' ? 'unlock.notFound' : 'unlock.error'),
          );
        } catch {
          showError(t('unlock.error'));
        }
      },
    },
  });
}
