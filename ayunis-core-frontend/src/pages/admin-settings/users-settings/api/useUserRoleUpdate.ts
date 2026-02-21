import { useUserControllerUpdateUserRole } from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { UserRole } from '../model/openapi';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UserRoleUpdateData {
  id: string;
  role: UserRole;
}

interface UseUserRoleUpdateOptions {
  onSuccessCallback?: () => void;
}

export function useUserRoleUpdate(options?: UseUserRoleUpdateOptions) {
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');
  const updateUserRoleMutation = useUserControllerUpdateUserRole({
    mutation: {
      onSuccess: () => {
        showSuccess(t('userRoleUpdate.success'));
        void router.invalidate();

        // Call the success callback
        if (options?.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        console.error('Error updating user role', err);
        try {
          const { code } = extractErrorData(err);
          if (code === 'USER_NOT_FOUND') {
            showError(t('userRoleUpdate.notFound'));
          } else {
            showError(t('userRoleUpdate.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('userRoleUpdate.error'));
        }
      },
    },
  });

  function updateUserRole(data: UserRoleUpdateData) {
    const roleData = {
      role: data.role,
    };

    updateUserRoleMutation.mutate({
      id: data.id,
      data: roleData,
    });
  }

  return {
    updateUserRole,
    isLoading: updateUserRoleMutation.isPending,
    isError: updateUserRoleMutation.isError,
    error: updateUserRoleMutation.error,
  };
}
