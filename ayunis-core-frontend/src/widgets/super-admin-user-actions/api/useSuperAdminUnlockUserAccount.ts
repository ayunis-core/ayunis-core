import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  getSuperAdminUserListControllerGetAllUsersQueryKey,
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
  useSuperAdminUsersControllerUnlockUser,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useSuperAdminUnlockUserAccount(orgId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('common', { keyPrefix: 'accountLock' });

  return useSuperAdminUsersControllerUnlockUser({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getSuperAdminUserListControllerGetAllUsersQueryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey:
              getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(orgId),
          }),
        ]);
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
