import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  getSuperAdminUserListControllerGetAllUsersQueryKey,
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
  useSuperAdminUsersControllerDeleteUser,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useSuperAdminDeleteUser(orgId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('super-admin-settings-org');

  return useSuperAdminUsersControllerDeleteUser({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminUserListControllerGetAllUsersQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(orgId),
        });
        void router.invalidate();
        showSuccess(t('deleteUser.success'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'USER_NOT_FOUND') {
            showError(t('deleteUser.notFound'));
          } else {
            showError(t('deleteUser.error'));
          }
        } catch {
          showError(t('deleteUser.error'));
        }
      },
    },
  });
}
