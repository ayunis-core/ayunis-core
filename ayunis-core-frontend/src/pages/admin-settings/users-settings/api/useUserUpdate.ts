import {
  getUserControllerGetUsersInOrganizationQueryKey,
  useAdminUserControllerAdminUpdateUser,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { AdminUpdateUserDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UserUpdateData {
  id: string;
  data: AdminUpdateUserDto;
}

interface UseUserUpdateOptions {
  onSuccessCallback?: () => void;
}

export function useUserUpdate(options?: UseUserUpdateOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');
  const mutation = useAdminUserControllerAdminUpdateUser({
    mutation: {
      onSuccess: () => {
        showSuccess(t('userUpdate.success'));
        options?.onSuccessCallback?.();
      },
      onError: (err) => {
        console.error('Error updating user', err);
        try {
          const { code } = extractErrorData(err);
          switch (code) {
            case 'USER_NOT_FOUND':
              showError(t('userUpdate.notFound'));
              break;
            case 'USER_ALREADY_EXISTS':
              showError(t('userUpdate.emailInUse'));
              break;
            default:
              showError(t('userUpdate.error'));
          }
        } catch {
          showError(t('userUpdate.error'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getUserControllerGetUsersInOrganizationQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  function updateUser({ id, data }: UserUpdateData) {
    mutation.mutate({ id, data });
  }

  return {
    updateUser,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
